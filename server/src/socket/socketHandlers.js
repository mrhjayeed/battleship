import pool from '../db/db.js';
import { assignName, getOrCreateAIPlayer, getLeaderboard } from '../players/PlayerRegistry.js';
import { GameSession } from '../game/GameSession.js';
import { gameManager } from '../game/GameManager.js';
import { generateRandomBoard } from '../game/ShipLogic.js';

// Keep track of socket mapping
// socket.id -> { playerName, playerId, currentGameId }
const socketMetadata = new Map();

// Get all unique active player names
function getActiveNames() {
  const names = new Set();
  for (const meta of socketMetadata.values()) {
    if (meta.playerName) {
      names.add(meta.playerName);
    }
  }
  return Array.from(names);
}

// Get count of unique active players
function getActivePlayersCount() {
  const names = new Set();
  for (const meta of socketMetadata.values()) {
    if (meta.playerName) {
      names.add(meta.playerName);
    }
  }
  return names.size;
}

// Active rematch requests in memory: gameId -> Set of player roles ('host', 'guest')
const rematchRequests = new Map();

async function getOpenSessions() {
  const result = await pool.query(
    `SELECT
      gs.id, gs.session_name, gs.grid_size, gs.ship_config,
      gs.status, gs.created_at,
      p.name AS host_name
    FROM game_sessions gs
    JOIN players p ON p.id = gs.host_player_id
    WHERE gs.status = 'waiting'
    ORDER BY gs.created_at DESC
    LIMIT 20`
  );
  return result.rows;
}

export function registerSocketHandlers(io) {
  gameManager.setIo(io);

  const broadcastLobbyUpdate = async () => {
    try {
      const sessions = await getOpenSessions();
      const activePlayersCount = getActivePlayersCount();
      io.to('lobby').emit('lobby-update', {
        sessions,
        activePlayers: activePlayersCount
      });
    } catch (err) {
      console.error('Error fetching lobby sessions:', err);
    }
  };

  const broadcastLeaderboardUpdate = async () => {
    try {
      const leaders = await getLeaderboard();
      io.emit('leaderboard-update', leaders);
    } catch (err) {
      console.error('Error broadcasting leaderboard:', err);
    }
  };

  // Register callback on gameManager to update stats and lobby in real time
  gameManager.onGameFinished = async () => {
    console.log('Game finished callback triggered: broadcasting lobby and leaderboard updates');
    await broadcastLobbyUpdate();
    await broadcastLeaderboardUpdate();
  };

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // --- LOBBY SYSTEM ---

    socket.on('join-lobby', async ({ playerName }) => {
      try {
        if (!playerName) {
          socket.emit('error-msg', 'Name is required');
          return;
        }

        // Assign name and upsert in DB
        const activeNames = getActiveNames();
        const player = await assignName(playerName, activeNames);
        const finalName = player.name;

        // Save metadata
        socketMetadata.set(socket.id, {
          playerName: finalName,
          playerId: player.id,
          currentGameId: null
        });

        socket.join('lobby');
        socket.emit('name-assigned', { finalName, player });

        console.log(`Player ${finalName} (ID: ${player.id}) joined lobby`);

        // Send leaderboard immediately
        const leaders = await getLeaderboard();
        socket.emit('leaderboard-update', leaders);

        // Broadcast general lobby statistics
        broadcastLobbyUpdate();
      } catch (err) {
        console.error('Error in join-lobby:', err);
        socket.emit('error-msg', 'Failed to join lobby');
      }
    });

    socket.on('logout', () => {
      console.log(`Player logged out manually: ${socket.id}`);
      socketMetadata.delete(socket.id);
      socket.leave('lobby');
      broadcastLobbyUpdate();
    });

    // --- GAME CREATION ---

    socket.on('create-game', async ({ config, sessionName, isAiGame, aiDifficulty }) => {
      const meta = socketMetadata.get(socket.id);
      if (!meta) {
        socket.emit('error-msg', 'Unauthenticated socket');
        return;
      }

      try {
        let guestPlayerId = null;
        let status = 'waiting';

        if (isAiGame) {
          const aiPlayer = await getOrCreateAIPlayer(aiDifficulty || 'medium');
          guestPlayerId = aiPlayer.id;
          status = 'placing';
        }

        const session = await GameSession.create({
          sessionName: sessionName || `${meta.playerName}'s Fleet`,
          hostPlayerId: meta.playerId,
          guestPlayerId,
          gridSize: config.gridSize,
          shipConfig: config.ships,
          status,
          isAiGame,
          aiDifficulty
        });

        // Track in GameManager
        gameManager.addGame(session);

        // Join room
        socket.leave('lobby');
        socket.join(session.id);
        meta.currentGameId = session.id;

        const role = 'host';
        const opponentName = isAiGame ? `AI (${aiDifficulty.charAt(0).toUpperCase() + aiDifficulty.slice(1)})` : null;

        socket.emit('game-joined', {
          gameId: session.id,
          opponentName,
          config: session.shipConfig,
          gridSize: session.gridSize,
          role,
          isAiGame,
          aiDifficulty,
          status: session.status
        });

        if (isAiGame) {
          // Pre-generate AI ship board on server
          const aiShips = generateRandomBoard(session.gridSize, session.shipConfig);
          session.placeShips('guest', aiShips);
          await session.save();

          // Start 90s placement timer for host
          gameManager.startPlacementTimer(session.id);
        } else {
          // Multiplayer: update lobby since we have a new open session
          broadcastLobbyUpdate();
        }
      } catch (err) {
        console.error('Error creating game:', err);
        socket.emit('error-msg', 'Failed to create game');
      }
    });

    // --- JOIN MULTIPLAYER GAME ---

    socket.on('join-game', async ({ gameId }) => {
      const meta = socketMetadata.get(socket.id);
      if (!meta) {
        socket.emit('error-msg', 'Unauthenticated socket');
        return;
      }

      try {
        const session = await gameManager.loadGame(gameId);
        if (!session) {
          socket.emit('error-msg', 'Game not found');
          return;
        }

        if (session.status !== 'waiting') {
          socket.emit('error-msg', 'Game is already full or started');
          return;
        }

        if (session.hostPlayerId === meta.playerId) {
          socket.emit('error-msg', 'You cannot join your own game');
          return;
        }

        // Join guest
        session.guestPlayerId = meta.playerId;
        session.guestName = meta.playerName;
        session.status = 'placing';
        await session.save();

        // Update sockets
        socket.leave('lobby');
        socket.join(gameId);
        meta.currentGameId = gameId;

        // Emit game-joined to guest
        socket.emit('game-joined', {
          gameId: session.id,
          opponentName: session.hostName,
          config: session.shipConfig,
          gridSize: session.gridSize,
          role: 'guest',
          isAiGame: false,
          status: session.status
        });

        // Notify host that opponent joined
        io.to(gameId).emit('opponent-joined', {
          opponentName: session.guestName,
          status: session.status
        });

        // Start placement timer
        gameManager.startPlacementTimer(gameId);

        // Update lobby list
        broadcastLobbyUpdate();
      } catch (err) {
        console.error('Error joining game:', err);
        socket.emit('error-msg', 'Failed to join game');
      }
    });

    // --- REJOIN GAME (ON REFRESH) ---

    socket.on('rejoin-game', async ({ gameId, playerName }) => {
      try {
        const session = await gameManager.loadGame(gameId);
        if (!session) {
          socket.emit('rejoin-failed', { reason: 'game-not-found' });
          return;
        }

        let role = null;
        if (session.hostName === playerName) {
          role = 'host';
        } else if (session.guestName === playerName) {
          role = 'guest';
        }

        if (!role) {
          socket.emit('rejoin-failed', { reason: 'not-a-player' });
          return;
        }

        // Clear disconnect timer
        gameManager.clearDisconnectTimer(gameId);

        // Authenticate socket state
        const playerId = role === 'host' ? session.hostPlayerId : session.guestPlayerId;
        socketMetadata.set(socket.id, {
          playerName,
          playerId,
          currentGameId: gameId
        });

        socket.leave('lobby');
        socket.join(gameId);

        // Send current status of board
        const opponentName = role === 'host' ? session.guestName : session.hostName;
        const myBoard = role === 'host' ? session.hostBoard : session.guestBoard;
        const myShots = role === 'host' ? session.hostShots : session.guestShots;
        const opponentShots = role === 'host' ? session.guestShots : session.hostShots;

        // If game is active, calculate remaining turn time
        // Note: For simplicity, the clients run visual 30s timers. Rejoin triggers resetting client timer.
        socket.emit('game-rejoined', {
          gameId: session.id,
          role,
          opponentName: opponentName || (session.isAiGame ? 'AI' : null),
          config: session.shipConfig,
          gridSize: session.gridSize,
          status: session.status,
          myBoard,
          myShots,
          opponentShots,
          currentTurn: session.currentTurn,
          chatLog: session.chatLog,
          isAiGame: session.isAiGame,
          aiDifficulty: session.aiDifficulty,
          winnerId: session.winnerPlayerId
        });

        // Notify other player that opponent is back
        socket.to(gameId).emit('opponent-reconnected', { playerName });

        console.log(`Player ${playerName} successfully rejoined game ${gameId}`);
      } catch (err) {
        console.error('Error rejoining game:', err);
        socket.emit('rejoin-failed', { reason: 'server-error' });
      }
    });

    // --- PLACE SHIPS ---

    socket.on('place-ships', async ({ gameId, ships }) => {
      const meta = socketMetadata.get(socket.id);
      if (!meta) return;

      const session = gameManager.getGame(gameId);
      if (!session || session.status !== 'placing') return;

      const role = session.hostPlayerId === meta.playerId ? 'host' : 'guest';

      // Save placement
      session.placeShips(role, ships);
      await session.save();

      console.log(`Player ${meta.playerName} (${role}) placed ships in game ${gameId}`);

      if (session.status === 'active') {
        gameManager.clearPlacementTimer(gameId);
        
        // Notify both players of game start and who goes first
        io.to(gameId).emit('game-start', {
          yourTurn: true, // evaluated on client
          currentTurn: session.currentTurn
        });

        gameManager.startTurnTimer(gameId);
      } else {
        // Notify the opponent that player is ready
        socket.to(gameId).emit('opponent-ready', {});
      }
    });

    // --- FIRE SHOT ---

    socket.on('fire-shot', async ({ gameId, row, col }) => {
      const meta = socketMetadata.get(socket.id);
      if (!meta) return;

      const session = gameManager.getGame(gameId);
      if (!session || session.status !== 'active') return;

      const role = session.hostPlayerId === meta.playerId ? 'host' : 'guest';

      if (session.currentTurn !== role) {
        socket.emit('error-msg', "It's not your turn!");
        return;
      }

      // Process shot
      const result = session.fireShot(role, row, col);
      if (!result) return; // Invalid shot or already fired

      await session.save();

      console.log(`Shot fired by ${meta.playerName} at (${row}, ${col}) -> result: ${result.result}`);

      // Broadcast shot outcome to the room
      io.to(gameId).emit('shot-result', {
        row,
        col,
        result: result.result,
        shipSunk: result.sunk,
        shipType: result.shipType,
        nextTurn: session.currentTurn,
        firingRole: role
      });

      if (session.status === 'finished') {
        gameManager.clearTurnTimer(gameId);
        await gameManager.finalizeStats(session);

        io.to(gameId).emit('game-over', {
          winner: role,
          reason: 'sunk',
          stats: gameManager.getGameSummaryStats(session)
        });

        gameManager.cleanup(gameId);
      } else {
        // Reset/start the 30s turn timer for the next turn
        gameManager.startTurnTimer(gameId);
      }
    });

    // --- CHAT SYSTEM ---

    socket.on('send-chat', async ({ gameId, message }) => {
      const meta = socketMetadata.get(socket.id);
      if (!meta) return;

      const session = gameManager.getGame(gameId);
      if (!session) return;

      const chatMsg = session.addChatMessage(meta.playerName, message);
      await session.save();

      io.to(gameId).emit('chat-message', chatMsg);
    });

    // --- REMATCH SYSTEM ---

    socket.on('rematch-request', async ({ gameId }) => {
      const meta = socketMetadata.get(socket.id);
      if (!meta) return;

      // We load the finished game from DB if it was cleaned up from active memory
      // Since rematch requires previous game configs, let's load
      let session = gameManager.getGame(gameId);
      if (!session) {
        // Load finished session from DB
        const raw = await GameSession.fetch(gameId);
        if (!raw) return;
        session = raw;
      }

      const role = session.hostPlayerId === meta.playerId ? 'host' : 'guest';

      let requests = rematchRequests.get(gameId);
      if (!requests) {
        requests = new Set();
        rematchRequests.set(gameId, requests);
      }

      requests.add(role);
      console.log(`Rematch requested by ${meta.playerName} (${role}) for game ${gameId}`);

      // If it's an AI game, the AI accepts rematch immediately!
      if (session.isAiGame) {
        requests.add('guest');
      }

      // Notify opponent
      socket.to(gameId).emit('opponent-requested-rematch', {});

      if (requests.has('host') && requests.has('guest')) {
        // Both accepted -> Create a brand new game session
        try {
          const newSession = await GameSession.create({
            sessionName: session.sessionName,
            hostPlayerId: session.hostPlayerId,
            guestPlayerId: session.guestPlayerId,
            gridSize: session.gridSize,
            shipConfig: session.shipConfig,
            status: 'placing', // Direct to placement
            isAiGame: session.isAiGame,
            aiDifficulty: session.aiDifficulty
          });

          gameManager.addGame(newSession);

          if (session.isAiGame) {
            // Auto place AI ships
            const aiShips = generateRandomBoard(newSession.gridSize, newSession.shipConfig);
            newSession.placeShips('guest', aiShips);
            await newSession.save();
          }

          // Broadcast to both that rematch started with the new gameId
          io.to(gameId).emit('rematch-start', { newGameId: newSession.id });

          // Start placement timer
          gameManager.startPlacementTimer(newSession.id);

          // Clean up old rematch requests record
          rematchRequests.delete(gameId);
        } catch (err) {
          console.error('Error creating rematch game:', err);
          socket.emit('error-msg', 'Failed to start rematch');
        }
      }
    });

    // --- LEAVE / FORFEIT ---
 
    socket.on('leave-game', async ({ gameId }) => {
      const meta = socketMetadata.get(socket.id);
      if (!meta) return;
 
      const session = gameManager.getGame(gameId);
      if (!session) {
        socket.leave(gameId);
        socket.join('lobby');
        if (meta.currentGameId === gameId) meta.currentGameId = null;
        broadcastLobbyUpdate();
        return;
      }
 
      if (session.status === 'waiting' || session.status === 'placing') {
        console.log(`Player ${meta.playerName} left game ${gameId} during status ${session.status} - aborting`);
        session.status = 'finished';
        session.finishedAt = new Date();
        await session.save();
 
        io.to(gameId).emit('game-over', {
          winner: null,
          reason: 'aborted',
          stats: null
        });
 
        socket.leave(gameId);
        socket.join('lobby');
        if (meta.currentGameId === gameId) meta.currentGameId = null;
        gameManager.cleanup(gameId);
        return;
      }
 
      const role = session.hostPlayerId === meta.playerId ? 'host' : 'guest';
      const winnerRole = role === 'host' ? 'guest' : 'host';
 
      console.log(`Player ${meta.playerName} left game ${gameId} - forfeit`);
 
      session.status = 'finished';
      session.winnerPlayerId = winnerRole === 'host' ? session.hostPlayerId : session.guestPlayerId;
      session.finishedAt = new Date();
      await session.save();
 
      await gameManager.finalizeStats(session);
 
      io.to(gameId).emit('game-over', {
        winner: winnerRole,
        reason: 'forfeit',
        stats: gameManager.getGameSummaryStats(session)
      });
 
      socket.leave(gameId);
      socket.join('lobby');
      if (meta.currentGameId === gameId) meta.currentGameId = null;
      gameManager.cleanup(gameId);
    });
 
    // --- SOCKET DISCONNECT ---
 
    socket.on('disconnect', async () => {
      console.log(`Socket disconnected: ${socket.id}`);
      const meta = socketMetadata.get(socket.id);
      if (meta) {
        const playerName = meta.playerName;
 
        const gameId = meta.currentGameId;
        if (gameId) {
          const session = gameManager.getGame(gameId);
          if (session) {
            if (session.status === 'active') {
              const role = session.hostPlayerId === meta.playerId ? 'host' : 'guest';
              // Start 60-second forfeit timer
              gameManager.startDisconnectTimer(gameId, role);
 
              // Notify opponent that player is disconnected
              io.to(gameId).emit('opponent-disconnected', { playerName });
            } else if (session.status === 'waiting' || session.status === 'placing') {
              // Abort game immediately since player disconnected during waiting/placing
              console.log(`Aborting game ${gameId} because player ${playerName} disconnected during ${session.status}`);
              session.status = 'finished';
              session.finishedAt = new Date();
              await session.save();
 
              io.to(gameId).emit('game-over', {
                winner: null,
                reason: 'aborted',
                stats: null
              });
 
              gameManager.cleanup(gameId);
            }
          }
        }
      }
      socketMetadata.delete(socket.id);
      broadcastLobbyUpdate();
    });
  });
}
