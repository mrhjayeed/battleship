import { useState, useEffect } from 'react';
import { usePlayer } from '../../context/PlayerContext.jsx';
import { useGame } from '../../context/GameContext.jsx';
import { useSound } from '../../hooks/useSound.js';
import { motion, AnimatePresence } from 'framer-motion';
import SessionCard from './SessionCard.jsx';
import CreateGameModal from './CreateGameModal.jsx';
import SoundToggle from '../ui/SoundToggle.jsx';

export default function LobbyPage() {
  const { playerName, leaderboard, activePlayers, sessions, logout } = usePlayer();
  const { createGame, joinGame } = useGame();
  const { startMusic, stopMusic } = useSound();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Play background music on lobby mount
  useEffect(() => {
    startMusic();
    return () => {
      stopMusic();
    };
  }, [startMusic, stopMusic]);

  // Find current player stats in leaderboard for display
  const myStats = leaderboard.find((player) => player.name === playerName) || {
    games_played: 0,
    wins: 0,
    losses: 0,
    win_rate: 0,
    accuracy: 0,
    longest_win_streak: 0,
  };

  const handleCreateSession = (data) => {
    setIsModalOpen(false);
    createGame(data.config, data.sessionName, data.isAiGame, data.aiDifficulty);
  };

  return (
    <div className="min-h-screen bg-bg-slate flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-navy/10 px-6 py-4 shadow-sm flex justify-between items-center z-10">
        <div className="flex items-center gap-3">
          <svg className="w-8 h-8 text-navy" viewBox="0 0 24 12" fill="currentColor">
            <path d="M2,8 L22,8 L20,3 L15,3 L14,1 L10,1 L9,3 L4,3 Z" />
            <rect x="1" y="9" width="22" height="2" rx="1" />
          </svg>
          <span className="font-heading font-extrabold text-xl text-navy tracking-tight">
            NEXUS BATTLECENTER
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <span className="text-xs text-navy/50 font-bold block">LOGGED IN AS</span>
            <span className="text-sm font-extrabold text-navy-dark">{playerName}</span>
          </div>
          <SoundToggle />
          <button
            onClick={logout}
            className="px-3.5 py-1.5 rounded-lg border border-hit/20 hover:bg-hit/5 text-hit font-bold text-xs cursor-pointer transition-all"
          >
            Leave
          </button>
        </div>
      </header>

      {/* Main Panel */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column: Player Stats & Game Cards */}
        <div className="lg:col-span-3 space-y-6">
          {/* Profile Metrics */}
          <div className="glass p-6 rounded-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-navy to-ocean" />
            <h2 className="text-lg font-bold text-navy-dark mb-4">Command Performance Summary</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white/60 p-4 rounded-xl border border-navy/5 text-center">
                <span className="text-xs text-navy/50 font-bold block mb-1">BATTLES</span>
                <span className="text-2xl font-extrabold text-navy-dark">{myStats.games_played}</span>
              </div>
              <div className="bg-white/60 p-4 rounded-xl border border-navy/5 text-center">
                <span className="text-xs text-victory/70 font-bold block mb-1">VICTORIES</span>
                <span className="text-2xl font-extrabold text-victory">{myStats.wins}</span>
              </div>
              <span className="hidden"></span>
              <div className="bg-white/60 p-4 rounded-xl border border-navy/5 text-center">
                <span className="text-xs text-hit/70 font-bold block mb-1">DEFEATS</span>
                <span className="text-2xl font-extrabold text-hit">{myStats.losses}</span>
              </div>
              <div className="bg-white/60 p-4 rounded-xl border border-navy/5 text-center">
                <span className="text-xs text-ocean font-bold block mb-1">WIN RATE</span>
                <span className="text-2xl font-extrabold text-ocean">{myStats.win_rate}%</span>
              </div>
            </div>
          </div>

          {/* Lobby Lists Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-navy/10 shadow-sm">
            <div>
              <h2 className="text-xl font-bold text-navy-dark">Active Engagements</h2>
              <p className="text-xs text-navy/50 font-medium mt-0.5">
                Join an active fleet room or create a new battlefield ({activePlayers} Admirals Online)
              </p>
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-5 py-2.5 bg-navy hover:bg-navy/90 text-white font-bold text-sm rounded-lg shadow-md cursor-pointer transition-all flex items-center gap-2"
            >
              <span className="text-lg">+</span> Create New Battle
            </button>
          </div>

          {/* Sessions Grid */}
          {sessions.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-navy/10 shadow-sm">
              <svg className="w-16 h-16 text-navy/20 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <h3 className="text-lg font-bold text-navy-dark mb-1">No Open Lobbies</h3>
              <p className="text-sm text-navy/60 mb-6">Create a room to await an opponent, or play immediately against the AI.</p>
              <button
                onClick={() => setIsModalOpen(true)}
                className="px-5 py-2 bg-ocean hover:bg-ocean/90 text-white font-bold text-sm rounded-lg shadow cursor-pointer transition-all"
              >
                Launch Operation
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <AnimatePresence>
                {sessions.map((session) => (
                  <SessionCard
                    key={session.id}
                    session={session}
                    onJoin={joinGame}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Right Column: Leaderboard Sidebar */}
        <div className="lg:col-span-1">
          <div className="glass p-5 rounded-2xl sticky top-4 max-h-[calc(100vh-2rem)] flex flex-col border border-navy/10">
            <h2 className="text-lg font-bold text-navy-dark mb-1">Global Rankings</h2>
            <p className="text-xs text-navy/50 font-medium mb-4">Top tactical officers listed by wins</p>
            
            <div className="space-y-3 overflow-y-auto flex-1 pr-1 custom-scrollbar">
              {leaderboard.length === 0 ? (
                <p className="text-xs text-center text-navy/40 py-6">Rankings compiling...</p>
              ) : (
                leaderboard.map((player, idx) => {
                  const isMe = player.name === playerName;
                  return (
                    <div
                      key={player.name}
                      className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                        isMe
                          ? 'border-ocean bg-ocean/5 shadow-sm'
                          : 'border-navy/5 bg-white/40'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                          idx === 0
                            ? 'bg-amber-400 text-amber-950'
                            : idx === 1
                            ? 'bg-slate-300 text-slate-900'
                            : idx === 2
                            ? 'bg-amber-600/30 text-amber-950'
                            : 'bg-navy/10 text-navy-dark'
                        }`}>
                          {idx + 1}
                        </span>
                        <div>
                          <span className={`text-sm font-bold block line-clamp-1 ${isMe ? 'text-ocean font-extrabold' : 'text-navy-dark'}`}>
                            {player.name}
                          </span>
                          <span className="text-[10px] text-navy/50 font-semibold uppercase">
                            Acc: {player.accuracy}% | WR: {player.win_rate}%
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-extrabold text-navy-dark block">
                          {player.wins} Wins
                        </span>
                        <span className="text-[9px] text-navy/40 font-bold block">
                          {player.games_played} Pl.
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-navy/10 py-6 text-center text-xs text-navy/50 font-medium z-10">
        <p>© 2026 Nexus Battlecenter. Developed by <a href="https://jayeed.dev" target="_blank" rel="noopener noreferrer" className="hover:text-ocean underline transition-colors">Jayeed</a>.</p>
      </footer>

      {/* Settings Modal */}
      <CreateGameModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreate={handleCreateSession}
      />
    </div>
  );
}
