import { useEffect } from 'react';
import { useGame } from '../../context/GameContext.jsx';
import { useTimer } from '../../hooks/useTimer.js';

export default function TurnIndicator() {
  const { currentTurn, role, opponentDisconnected, status } = useGame();
  
  const isMyTurn = currentTurn === role;

  // 30s turn countdown (resets every time turn changes)
  const { timeLeft, reset } = useTimer(30, () => {
    // Timeout handled server-side, but we display timer locally
  });

  // 60s disconnect countdown
  const { timeLeft: disconnectTimeLeft, reset: resetDisconnect } = useTimer(60, () => {
    // Timeout handled server-side
  });

  // Reset turn timer when currentTurn updates
  useEffect(() => {
    reset(30);
  }, [currentTurn, reset]);

  // Handle disconnect timer reset/start
  useEffect(() => {
    if (opponentDisconnected) {
      resetDisconnect(60);
    }
  }, [opponentDisconnected, resetDisconnect]);

  if (status !== 'active') return null;

  if (opponentDisconnected) {
    return (
      <div className="w-full bg-hit text-white px-6 py-3.5 rounded-2xl shadow-md flex items-center justify-between animate-pulse">
        <div className="flex items-center gap-3">
          <span className="text-xl">⚠️</span>
          <div>
            <span className="font-heading font-extrabold text-sm uppercase tracking-wider block">Connection Interrupted</span>
            <span className="text-xs opacity-90 font-medium">Opponent disconnected. Awaiting re-establishment.</span>
          </div>
        </div>
        <div className="text-right">
          <span className="text-xs opacity-75 font-bold block uppercase">Forfeit Limit</span>
          <span className="text-lg font-extrabold font-heading">{disconnectTimeLeft}s</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full px-6 py-4 rounded-2xl shadow-sm border flex flex-col sm:flex-row items-center justify-between gap-4 transition-all duration-300 ${
      isMyTurn
        ? 'bg-ocean/10 border-ocean/20 text-ocean'
        : 'bg-navy/5 border-navy/10 text-navy'
    }`}>
      <div className="flex items-center gap-3">
        {isMyTurn ? (
          <div className="w-2.5 h-2.5 rounded-full bg-ocean animate-ping" />
        ) : (
          <div className="inline-block w-4 h-4 border-2 border-navy/30 border-t-navy rounded-full animate-spin" />
        )}
        <div>
          <span className="font-heading font-extrabold text-sm uppercase tracking-wider block">
            {isMyTurn ? 'Main Battery Ready' : 'Incoming Fire Warning'}
          </span>
          <span className="text-xs text-navy/60 font-medium">
            {isMyTurn ? 'Select a coordinate on the tactical grid' : 'Awaiting enemy target coordinates'}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-xs font-bold uppercase tracking-wider opacity-60">Turn Window</span>
        <span className="font-heading font-extrabold text-xl px-3 py-1 bg-white/80 rounded-lg border border-navy/5 shadow-inner">
          0:{timeLeft < 10 ? `0${timeLeft}` : timeLeft}
        </span>
      </div>
    </div>
  );
}
