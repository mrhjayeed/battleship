import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { SHIP_TYPES, SHIP_PRESETS, getFleetCoverage } from '../../utils/shipUtils.js';

export default function CreateGameModal({ isOpen, onClose, onCreate }) {
  const [gridSize, setGridSize] = useState(10);
  const [gameMode, setGameMode] = useState('multiplayer'); // 'multiplayer' | 'ai'
  const [aiDifficulty, setAiDifficulty] = useState('medium'); // 'easy' | 'medium' | 'hard'
  const [presetType, setPresetType] = useState('classic'); // 'classic' | 'mini' | 'mega' | 'custom'
  const [customShips, setCustomShips] = useState({
    carrier: 1,
    battleship: 1,
    cruiser: 1,
    submarine: 1,
    destroyer: 1
  });
  const [sessionName, setSessionName] = useState('');

  // Sync preset selection to custom ships state for easy editing
  useEffect(() => {
    if (presetType !== 'custom') {
      setCustomShips({
        carrier: 0,
        battleship: 0,
        cruiser: 0,
        submarine: 0,
        destroyer: 0,
        ...SHIP_PRESETS[presetType]
      });
    }
  }, [presetType]);

  if (!isOpen) return null;

  const currentShips = customShips;
  const coverage = getFleetCoverage(currentShips, gridSize);
  const totalShips = Object.values(currentShips).reduce((a, b) => a + b, 0);

  const handleCustomChange = (shipType, change) => {
    setPresetType('custom');
    setCustomShips((prev) => {
      const nextVal = Math.max(0, Math.min(5, prev[shipType] + change));
      return { ...prev, [shipType]: nextVal };
    });
  };

  const handleLaunch = () => {
    if (totalShips === 0) return;
    if (coverage > 60) return; // Too dense

    onCreate({
      config: {
        gridSize,
        ships: currentShips
      },
      sessionName: sessionName.trim() || undefined,
      isAiGame: gameMode === 'ai',
      aiDifficulty: gameMode === 'ai' ? aiDifficulty : undefined
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-navy-dark/60 backdrop-blur-sm"
      />

      {/* Modal Container */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-navy/10 overflow-hidden z-10 max-h-[90vh] flex flex-col"
      >
        <div className="p-6 border-b border-navy/10 flex justify-between items-center bg-bg-slate">
          <div>
            <h2 className="text-2xl font-bold text-navy-dark">Session Operations</h2>
            <p className="text-xs text-navy/60">Configure your parameters for the next deployment</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-navy/5 text-navy/70 hover:text-navy cursor-pointer transition-all"
          >
            ✕
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-6 custom-scrollbar">
          {/* Custom Session Name */}
          {gameMode === 'multiplayer' && (
            <div>
              <label className="block text-xs font-bold text-navy uppercase tracking-wider mb-2">
                Custom Session Name
              </label>
              <input
                type="text"
                value={sessionName}
                onChange={(e) => setSessionName(e.target.value)}
                placeholder="e.g. Operation Midway"
                maxLength={30}
                className="w-full px-4 py-2.5 rounded-lg border border-navy/20 bg-white/50 text-navy-dark focus:outline-none focus:ring-2 focus:ring-ocean transition-all"
              />
            </div>
          )}

          {/* Grid Size */}
          <div>
            <label className="block text-xs font-bold text-navy uppercase tracking-wider mb-2">
              Grid Dimensions
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[8, 10, 12].map((size) => (
                <button
                  key={size}
                  onClick={() => setGridSize(size)}
                  className={`py-3 rounded-lg border font-bold text-sm cursor-pointer transition-all ${
                    gridSize === size
                      ? 'border-ocean bg-ocean/10 text-ocean shadow-sm'
                      : 'border-navy/10 hover:border-navy/30 text-navy/70'
                  }`}
                >
                  {size} × {size}
                </button>
              ))}
            </div>
          </div>

          {/* Game Mode */}
          <div>
            <label className="block text-xs font-bold text-navy uppercase tracking-wider mb-2">
              Engagement Vector
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setGameMode('multiplayer')}
                className={`py-3 rounded-lg border font-bold text-sm cursor-pointer transition-all ${
                  gameMode === 'multiplayer'
                    ? 'border-navy bg-navy/5 text-navy shadow-sm'
                    : 'border-navy/10 hover:border-navy/30 text-navy/70'
                }`}
              >
                Multiplayer Matchmaking
              </button>
              <button
                onClick={() => setGameMode('ai')}
                className={`py-3 rounded-lg border font-bold text-sm cursor-pointer transition-all ${
                  gameMode === 'ai'
                    ? 'border-navy bg-navy/5 text-navy shadow-sm'
                    : 'border-navy/10 hover:border-navy/30 text-navy/70'
                }`}
              >
                Single Player (vs AI)
              </button>
            </div>
          </div>

          {/* AI Difficulty */}
          {gameMode === 'ai' && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              className="overflow-hidden"
            >
              <label className="block text-xs font-bold text-navy uppercase tracking-wider mb-2">
                AI Tactician Rank
              </label>
              <div className="grid grid-cols-3 gap-3">
                {['easy', 'medium', 'hard'].map((diff) => (
                  <button
                    key={diff}
                    onClick={() => setAiDifficulty(diff)}
                    className={`py-2.5 rounded-lg border font-bold text-sm capitalize cursor-pointer transition-all ${
                      aiDifficulty === diff
                        ? 'border-ocean bg-ocean/10 text-ocean shadow-sm'
                        : 'border-navy/10 hover:border-navy/30 text-navy/70'
                    }`}
                  >
                    {diff}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Fleet Selection */}
          <div>
            <label className="block text-xs font-bold text-navy uppercase tracking-wider mb-2">
              Fleet Presets
            </label>
            <div className="grid grid-cols-4 gap-3 mb-4">
              {['classic', 'mini', 'mega', 'custom'].map((preset) => (
                <button
                  key={preset}
                  onClick={() => setPresetType(preset)}
                  className={`py-2 rounded-lg border font-bold text-xs capitalize cursor-pointer transition-all ${
                    presetType === preset
                      ? 'border-ocean bg-ocean/10 text-ocean shadow-sm'
                      : 'border-navy/10 hover:border-navy/30 text-navy/70'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>

            {/* Steppers */}
            <div className="space-y-3 bg-bg-slate p-4 rounded-xl">
              {Object.entries(SHIP_TYPES).map(([type, details]) => (
                <div key={type} className="flex justify-between items-center">
                  <div>
                    <span className="text-sm font-bold text-navy-dark">{details.name}</span>
                    <span className="text-xs text-navy/50 font-semibold ml-2">Size: {details.size}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleCustomChange(type, -1)}
                      disabled={currentShips[type] <= 0}
                      className="w-8 h-8 rounded-lg bg-white border border-navy/10 hover:border-navy/30 text-navy font-bold flex items-center justify-center cursor-pointer transition-all disabled:opacity-40"
                    >
                      -
                    </button>
                    <span className="w-4 text-center font-bold text-navy-dark text-sm">
                      {currentShips[type]}
                    </span>
                    <button
                      onClick={() => handleCustomChange(type, 1)}
                      disabled={currentShips[type] >= 5}
                      className="w-8 h-8 rounded-lg bg-white border border-navy/10 hover:border-navy/30 text-navy font-bold flex items-center justify-center cursor-pointer transition-all disabled:opacity-40"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Preview Visualisation */}
          <div className="p-4 rounded-xl flex items-center justify-between border border-navy/10 bg-white shadow-sm">
            <div>
              <span className="text-xs font-bold text-navy uppercase tracking-wide block">Fleet Size</span>
              <span className="text-lg font-extrabold text-navy-dark">{totalShips} Combatants</span>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold text-navy uppercase tracking-wide block">Grid Density</span>
              <span className={`text-lg font-extrabold ${
                coverage > 50 ? 'text-hit' : coverage > 35 ? 'text-orange-500' : 'text-victory'
              }`}>
                {coverage}% Coverage
              </span>
            </div>
          </div>

          {coverage > 50 && (
            <p className="text-xs font-semibold text-hit bg-hit/10 p-3 rounded-lg text-center">
              ⚠️ Fleet coverage is too high. Reduce ship counts or increase grid dimensions.
            </p>
          )}

          {totalShips === 0 && (
            <p className="text-xs font-semibold text-hit bg-hit/10 p-3 rounded-lg text-center">
              ⚠️ You must deploy at least one ship.
            </p>
          )}
        </div>

        <div className="p-6 border-t border-navy/10 bg-bg-slate flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-lg border border-navy/10 hover:bg-navy/5 text-navy font-bold text-sm cursor-pointer transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleLaunch}
            disabled={totalShips === 0 || coverage > 50}
            className="px-6 py-2.5 bg-navy hover:bg-navy/90 text-white font-bold text-sm rounded-lg shadow-md cursor-pointer transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Launch Session
          </button>
        </div>
      </motion.div>
    </div>
  );
}
