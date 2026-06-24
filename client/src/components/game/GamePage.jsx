import { useEffect } from 'react';
import { useGame } from '../../context/GameContext.jsx';
import { useSound } from '../../hooks/useSound.js';
import { motion, AnimatePresence } from 'framer-motion';
import ShipPlacement from './ShipPlacement.jsx';
import GameBoard from './GameBoard.jsx';
import ShotGrid from './ShotGrid.jsx';
import ChatPanel from './ChatPanel.jsx';
import TurnIndicator from './TurnIndicator.jsx';
import SoundToggle from '../ui/SoundToggle.jsx';

export default function GamePage() {
  const {
    gameId,
    status,
    opponentName,
    role,
    isAiGame,
    aiDifficulty,
    winnerId,
    gameOverStats,
    rematchRequestedByOpponent,
    rematchRequestedByMe,
    lastEvent,
    setLastEvent,
    requestRematch,
    leaveGame
  } = useGame();

  const { playSFX, startMusic, stopMusic } = useSound();

  // Start background music during active game play
  useEffect(() => {
    startMusic();
    return () => {
      stopMusic();
    };
  }, [startMusic, stopMusic]);

  // Hook into game events to trigger SFX
  useEffect(() => {
    if (lastEvent) {
      const { type } = lastEvent;
      if (['hit', 'miss', 'victory', 'defeat'].includes(type)) {
        playSFX(type);
      }
      setLastEvent(null); // Reset
    }
  }, [lastEvent, playSFX, setLastEvent]);

  // Render Placement View
  if (status === 'placing' || status === 'waiting') {
    return (
      <div className="min-h-screen bg-bg-slate flex flex-col">
        <header className="bg-white border-b border-navy/10 px-6 py-4 shadow-sm flex justify-between items-center z-10">
          <div className="flex items-center gap-3">
            <svg className="w-8 h-8 text-navy" viewBox="0 0 24 12" fill="currentColor">
              <path d="M2,8 L22,8 L20,3 L15,3 L14,1 L10,1 L9,3 L4,3 Z" />
            </svg>
            <span className="font-heading font-extrabold text-xl text-navy tracking-tight">
              DEPLOYMENT PHASE
            </span>
          </div>
          <div className="flex items-center gap-4">
            <SoundToggle />
            <button
              onClick={leaveGame}
              className="px-3.5 py-1.5 rounded-lg border border-hit/20 hover:bg-hit/5 text-hit font-bold text-xs cursor-pointer transition-all"
            >
              Abort Session
            </button>
          </div>
        </header>

        <main className="flex-1 py-8 px-4">
          {status === 'waiting' ? (
            <div className="max-w-md mx-auto p-8 bg-white rounded-2xl border border-navy/10 shadow-lg text-center mt-12">
              <div className="w-12 h-12 border-4 border-navy/20 border-t-navy rounded-full animate-spin mx-auto mb-6" />
              <h2 className="text-xl font-bold text-navy-dark mb-2">Awaiting Opposition</h2>
              <p className="text-sm text-navy/60 mb-4">Sharing connection details. Session will commence once an opponent joins.</p>
              <div className="bg-bg-slate p-3 rounded-lg text-xs font-mono select-all text-navy/70 border border-navy/5 break-all">
                {gameId}
              </div>
            </div>
          ) : (
            <ShipPlacement />
          )}
        </main>
      </div>
    );
  }

  const isWinner = winnerId && (
    (winnerId === gameOverStats?.winnerId && role === 'host' && gameOverStats.winnerId === gameOverStats.winnerId) || // Wait, let's make it simpler
    (role === 'host' && winnerId === gameOverStats?.winnerId) || // No, wait, role is host/guest. winnerId is player.id!
    // Let's resolve: does player ID match winnerId?
    // Let's look at PlayerContext: we have playerId.
    // Yes! Let's check:
    // isWinner = (role === 'host' && winnerId === hostPlayerId) or check against active stats
    // Even easier: check who won in the game-over payload. In socketHandlers: game-over sends winner role ('host'|'guest')
    // Wait, GameContext updates winnerId to stats.winnerId.
    // Let's check who won based on:
    // stats.winnerId === playerId?
    // Yes! In PlayerContext we store playerId!
    // So isWinner = (winnerId !== null && winnerId === playerId)
    // Let's use this simple logic.
    false // fallback (we will query below)
  );

  // Let's fetch playerId from local storage to check win state
  const playerIdStr = localStorage.getItem('battleship_player_id');
  const playerId = playerIdStr ? parseInt(playerIdStr) : null;
  const didIWin = winnerId !== null && winnerId === playerId;

  return (
    <div className="min-h-screen bg-bg-slate flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-navy/10 px-6 py-4 shadow-sm flex justify-between items-center z-10">
        <div className="flex items-center gap-3">
          <svg className="w-8 h-8 text-navy animate-pulse" viewBox="0 0 24 12" fill="currentColor">
            <path d="M2,8 L22,8 L20,3 L15,3 L14,1 L10,1 L9,3 L4,3 Z" />
          </svg>
          <span className="font-heading font-extrabold text-xl text-navy tracking-tight uppercase">
            {isAiGame ? `Tactical Simulation (${aiDifficulty})` : 'Combat Theater'}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <SoundToggle />
          <button
            onClick={leaveGame}
            className="px-3.5 py-1.5 rounded-lg border border-hit/20 hover:bg-hit/5 text-hit font-bold text-xs cursor-pointer transition-all"
          >
            Forfeit Match
          </button>
        </div>
      </header>

      {/* Main Game Screen */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-6">
        <TurnIndicator />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Grids Stack */}
          <div className="lg:col-span-8 grid grid-cols-1 xl:grid-cols-2 gap-6 justify-center">
            <GameBoard />
            <ShotGrid />
          </div>

          {/* Right Panel: Chat and Stats */}
          <div className="lg:col-span-4 space-y-6">
            {/* Opponent Info card */}
            <div className="bg-white p-4 rounded-xl border border-navy/10 shadow-sm">
              <span className="text-[10px] text-navy/40 font-bold block uppercase mb-1">Target Vessel Command</span>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-hit/10 text-hit flex items-center justify-center font-bold text-sm">
                  🎯
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-navy-dark">
                    {opponentName || (isAiGame ? 'AI System' : 'Awaiting Connection')}
                  </h4>
                  <span className="text-[10px] text-navy/50 font-bold uppercase">
                    {isAiGame ? `Tactical Rank: ${aiDifficulty}` : 'Human Opponent'}
                  </span>
                </div>
              </div>
            </div>

            <ChatPanel />
          </div>
        </div>
      </main>

      {/* Game Over Modal / Overlay */}
      <AnimatePresence>
        {status === 'finished' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-navy-dark/70 backdrop-blur-md"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 20, opacity: 0 }}
            transition={{ type: 'spring', damping: 20 }}
            className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-navy/10 overflow-hidden z-10 p-8 text-center"
          >
            {/* Top color strip */}
            <div className={`absolute top-0 left-0 right-0 h-2 ${didIWin ? 'bg-victory' : 'bg-hit'}`} />

            {/* Icon Banner */}
            <div className="my-4">
              <span className="text-6xl block">
                {didIWin ? '🏆' : '💀'}
              </span>
            </div>

            <h2 className={`text-3xl font-extrabold font-heading tracking-tight uppercase ${
              didIWin ? 'text-victory' : 'text-hit'
            }`}>
              {didIWin ? 'Combat Victory!' : 'Fleet Defeated'}
            </h2>
            <p className="text-sm text-navy/50 mt-1 font-medium">
              {didIWin ? 'Opposition fleet has been completely neutralized' : 'Your vessels have suffered critical structure failure'}
            </p>

            {/* Comparative stats table */}
            {gameOverStats && (
              <div className="my-6 bg-bg-slate rounded-xl p-4 border border-navy/5 space-y-3">
                <h3 className="text-xs font-bold text-navy uppercase tracking-wider">Mission Debrief Metrics</h3>
                
                <div className="grid grid-cols-3 gap-2 text-xs font-bold text-navy/60 border-b border-navy/10 pb-2">
                  <span className="text-left">Stat</span>
                  <span>You ({role === 'host' ? 'Host' : 'Guest'})</span>
                  <span>Enemy</span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs font-medium text-navy-dark">
                  <span className="text-left font-bold text-navy/60">Missiles Fired</span>
                  <span>{role === 'host' ? gameOverStats.hostStats.shots : gameOverStats.guestStats.shots}</span>
                  <span>{role === 'host' ? gameOverStats.guestStats.shots : gameOverStats.hostStats.shots}</span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs font-medium text-navy-dark">
                  <span className="text-left font-bold text-navy/60">Target Hits</span>
                  <span>{role === 'host' ? gameOverStats.hostStats.hits : gameOverStats.guestStats.hits}</span>
                  <span>{role === 'host' ? gameOverStats.guestStats.hits : gameOverStats.hostStats.hits}</span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs font-medium text-navy-dark">
                  <span className="text-left font-bold text-navy/60">Target Accuracy</span>
                  <span className={didIWin ? 'text-victory font-bold' : 'text-navy-dark'}>
                    {role === 'host' ? gameOverStats.hostStats.accuracy : gameOverStats.guestStats.accuracy}%
                  </span>
                  <span className={!didIWin ? 'text-hit font-bold' : 'text-navy-dark'}>
                    {role === 'host' ? gameOverStats.guestStats.accuracy : gameOverStats.hostStats.accuracy}%
                  </span>
                </div>

                <div className="text-[10px] text-navy/40 font-semibold pt-1">
                  Total engagement duration: {Math.floor(gameOverStats.durationSeconds / 60)}m {gameOverStats.durationSeconds % 60}s
                </div>
              </div>
            )}

            {/* Rematch flow status */}
            {rematchRequestedByMe && !rematchRequestedByOpponent && (
              <p className="text-xs font-semibold text-ocean bg-ocean/10 py-2 px-3 rounded-lg mb-4">
                📡 Rematch signal transmitted. Awaiting opponent response...
              </p>
            )}

            {rematchRequestedByOpponent && !rematchRequestedByMe && (
              <p className="text-xs font-semibold text-victory bg-victory/10 py-2 px-3 rounded-lg mb-4">
                ⚡ Enemy requested rematch. Ready to redeploy?
              </p>
            )}

            {/* Buttons */}
            <div className="flex gap-4 mt-6">
              <button
                onClick={requestRematch}
                disabled={rematchRequestedByMe}
                className="flex-1 py-3 bg-ocean hover:bg-ocean/90 disabled:opacity-50 text-white font-extrabold text-sm rounded-lg shadow cursor-pointer transition-all"
              >
                Request Rematch
              </button>
              <button
                onClick={leaveGame}
                className="flex-1 py-3 bg-bg-slate hover:bg-navy/5 text-navy font-extrabold text-sm rounded-lg border border-navy/15 cursor-pointer transition-all"
              >
                Back to Lobby
              </button>
            </div>
          </motion.div>
        </div>
        )}
      </AnimatePresence>
    </div>
  );
}
