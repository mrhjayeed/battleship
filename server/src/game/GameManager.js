import { GameSession } from './GameSession.js';
import { generateRandomBoard } from './ShipLogic.js';
import { getAIShot } from './AIPlayer.js';
import { updatePlayerStats } from '../players/PlayerRegistry.js';

class GameManager {
  constructor() {
    this.activeGames = new Map(); // gameId -> GameSession instance
    this.timers = new Map(); // gameId -> { placementTimeout, turnTimeout, disconnectTimeout }
    this.io = null;
  }

  setIo(io) {
    this.io = io;
  }

  getGame(gameId) {
    return this.activeGames.get(gameId);
  }

  addGame(session) {
    this.activeGames.set(session.id, session);
    this.timers.set(session.id, {
      placementTimeout: null,
      turnTimeout: null,
      disconnectTimeout: null
    });
  }

  async loadGame(gameId) {
    if (this.activeGames.has(gameId)) {
      return this.activeGames.get(gameId);
    }
    const session = await GameSession.fetch(gameId);
    if (session) {
      this.addGame(session);
      return session;
    }
    return null;
  }

  // --- TIMERS ---

  startPlacementTimer(gameId) {
    this.clearPlacementTimer(gameId);
    const game = this.activeGames.get(gameId);
    if (!game) return;

    // 90 seconds placement limit
    const timeout = setTimeout(async () => {
      console.log(`Placement timer expired for game: ${gameId}`);
      // Auto place for players who haven't placed yet
      if (!game.hostBoard) {
        const ships = generateRandomBoard(game.gridSize, game.shipConfig);
        game.placeShips('host', ships);
        this.io.to(gameId).emit('placement-auto', { role: 'host' });
      }
      if (!game.guestBoard && !game.isAiGame) {
        const ships = generateRandomBoard(game.gridSize, game.shipConfig);
        game.placeShips('guest', ships);
        this.io.to(gameId).emit('placement-auto', { role: 'guest' });
      }

      await game.save();
      
      if (game.status === 'active') {
        this.io.to(gameId).emit('game-start', {
          yourTurn: true, // will be check on turn indicator
          currentTurn: game.currentTurn,
          hostBoard: null, // Keep guest board hidden
          guestBoard: null
        });
        this.startTurnTimer(gameId);
      }
    }, 90000);

    const gameTimers = this.timers.get(gameId);
    if (gameTimers) gameTimers.placementTimeout = timeout;
  }

  clearPlacementTimer(gameId) {
    const gameTimers = this.timers.get(gameId);
    if (gameTimers?.placementTimeout) {
      clearTimeout(gameTimers.placementTimeout);
      gameTimers.placementTimeout = null;
    }
  }

  startTurnTimer(gameId) {
    this.clearTurnTimer(gameId);
    const game = this.activeGames.get(gameId);
    if (!game || game.status !== 'active') return;

    // If it's AI turn, don't start client timer, trigger AI move instead
    if (game.isAiGame && game.currentTurn === 'guest') {
      this.triggerAIMove(gameId);
      return;
    }

    // 30 seconds turn timer
    const timeout = setTimeout(async () => {
      console.log(`Turn timer expired for turn ${game.currentTurn} in game ${gameId}`);
      // Forfeit turn: switch turn
      game.currentTurn = game.currentTurn === 'host' ? 'guest' : 'host';
      await game.save();

      this.io.to(gameId).emit('turn-timeout', { nextTurn: game.currentTurn });
      
      this.startTurnTimer(gameId);
    }, 30000);

    const gameTimers = this.timers.get(gameId);
    if (gameTimers) gameTimers.turnTimeout = timeout;
  }

  clearTurnTimer(gameId) {
    const gameTimers = this.timers.get(gameId);
    if (gameTimers?.turnTimeout) {
      clearTimeout(gameTimers.turnTimeout);
      gameTimers.turnTimeout = null;
    }
  }

  startDisconnectTimer(gameId, playerRole) {
    const gameTimers = this.timers.get(gameId);
    if (!gameTimers) return;

    if (gameTimers.disconnectTimeout) return; // Timer already running

    const game = this.activeGames.get(gameId);
    if (!game || game.status !== 'active') return;

    console.log(`Starting 60s disconnect timer for ${playerRole} in game ${gameId}`);

    gameTimers.disconnectTimeout = setTimeout(async () => {
      console.log(`Disconnect timer expired for ${playerRole} in game ${gameId}`);
      
      // Opponent wins by forfeit
      const winnerRole = playerRole === 'host' ? 'guest' : 'host';
      game.status = 'finished';
      game.winnerPlayerId = winnerRole === 'host' ? game.hostPlayerId : game.guestPlayerId;
      game.finishedAt = new Date();
      await game.save();

      await this.finalizeStats(game);

      this.io.to(gameId).emit('game-over', {
        winner: winnerRole,
        reason: 'forfeit',
        stats: this.getGameSummaryStats(game)
      });

      this.cleanup(gameId);
    }, 60000);
  }

  clearDisconnectTimer(gameId) {
    const gameTimers = this.timers.get(gameId);
    if (gameTimers?.disconnectTimeout) {
      console.log(`Clearing disconnect timer for game ${gameId}`);
      clearTimeout(gameTimers.disconnectTimeout);
      gameTimers.disconnectTimeout = null;
    }
  }

  // --- AI ACTIONS ---

  triggerAIMove(gameId) {
    const game = this.activeGames.get(gameId);
    if (!game || !game.isAiGame || game.currentTurn !== 'guest' || game.status !== 'active') return;

    // Simulate AI thinking delay (1 to 2 seconds)
    setTimeout(async () => {
      // Fetch fresh reference in case game was deleted/closed during timeout
      const activeGame = this.activeGames.get(gameId);
      if (!activeGame || activeGame.currentTurn !== 'guest' || activeGame.status !== 'active') return;

      const aiShot = getAIShot(
        activeGame.aiDifficulty || 'medium',
        activeGame.hostBoard,
        activeGame.guestShots,
        activeGame.gridSize
      );

      if (!aiShot) return;

      const shotResult = activeGame.fireShot('guest', aiShot.row, aiShot.col);
      if (!shotResult) return;

      await activeGame.save();

      // Notify player of AI's shot
      this.io.to(gameId).emit('shot-result', {
        row: aiShot.row,
        col: aiShot.col,
        result: shotResult.result,
        shipSunk: shotResult.sunk,
        shipType: shotResult.shipType,
        nextTurn: activeGame.currentTurn,
        firingRole: 'guest'
      });

      if (activeGame.status === 'finished') {
        await this.finalizeStats(activeGame);
        this.io.to(gameId).emit('game-over', {
          winner: 'guest',
          reason: 'sunk',
          stats: this.getGameSummaryStats(activeGame)
        });
        this.cleanup(gameId);
      } else {
        // Continue game
        this.startTurnTimer(gameId);
      }
    }, 1500);
  }

  // --- GAME FINALIZATION ---

  async finalizeStats(game) {
    const duration = Math.max(
      1,
      Math.floor(((game.finishedAt || new Date()) - (game.startedAt || new Date())) / 1000)
    );

    const hostWon = game.winnerPlayerId === game.hostPlayerId;
    const guestWon = game.winnerPlayerId === game.guestPlayerId;

    const hostShotsCount = game.hostShots.length;
    const hostHitsCount = game.hostShots.filter(s => s.result === 'hit').length;

    const guestShotsCount = game.guestShots.length;
    const guestHitsCount = game.guestShots.filter(s => s.result === 'hit').length;

    try {
      // Only update official player profile statistics for PvP multiplayer matches
      if (!game.isAiGame) {
        // Update Host Stats
        await updatePlayerStats(game.hostPlayerId, hostWon, hostShotsCount, hostHitsCount, duration);

        // Update Guest Stats
        if (game.guestPlayerId) {
          await updatePlayerStats(game.guestPlayerId, guestWon, guestShotsCount, guestHitsCount, duration);
        }
      }
    } catch (err) {
      console.error('Error finalising player database stats:', err);
    }
  }

  getGameSummaryStats(game) {
    const duration = Math.floor(
      ((game.finishedAt || new Date()) - (game.startedAt || new Date())) / 1000
    );

    const getAccuracy = (shots) => {
      if (shots.length === 0) return 0;
      const hits = shots.filter(s => s.result === 'hit').length;
      return Math.round((hits / shots.length) * 100);
    };

    return {
      durationSeconds: duration,
      winnerId: game.winnerPlayerId,
      hostName: game.hostName,
      guestName: game.guestName || 'AI',
      hostStats: {
        shots: game.hostShots.length,
        hits: game.hostShots.filter(s => s.result === 'hit').length,
        accuracy: getAccuracy(game.hostShots)
      },
      guestStats: {
        shots: game.guestShots.length,
        hits: game.guestShots.filter(s => s.result === 'hit').length,
        accuracy: getAccuracy(game.guestShots)
      }
    };
  }

  cleanup(gameId) {
    this.clearPlacementTimer(gameId);
    this.clearTurnTimer(gameId);
    this.clearDisconnectTimeout(gameId);
    this.activeGames.delete(gameId);
    this.timers.delete(gameId);
  }

  clearDisconnectTimeout(gameId) {
    const gameTimers = this.timers.get(gameId);
    if (gameTimers?.disconnectTimeout) {
      clearTimeout(gameTimers.disconnectTimeout);
      gameTimers.disconnectTimeout = null;
    }
  }
}

export const gameManager = new GameManager();
