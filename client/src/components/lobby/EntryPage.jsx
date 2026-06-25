import { useState, useEffect } from 'react';
import { usePlayer } from '../../context/PlayerContext.jsx';
import { motion } from 'framer-motion';

export default function EntryPage() {
  const { login, isAuthenticating } = usePlayer();
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [showWakingNotice, setShowWakingNotice] = useState(false);

  useEffect(() => {
    let timer;
    if (isAuthenticating) {
      timer = setTimeout(() => {
        setShowWakingNotice(true);
      }, 3000);
    } else {
      setShowWakingNotice(false);
    }
    return () => clearTimeout(timer);
  }, [isAuthenticating]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Name cannot be empty.');
      return;
    }
    if (trimmed.length < 2 || trimmed.length > 15) {
      setError('Name must be between 2 and 15 characters.');
      return;
    }
    if (!/^[a-zA-Z0-9\s]+$/.test(trimmed)) {
      setError('Name can only contain letters, numbers, and spaces.');
      return;
    }
    setError('');
    login(trimmed);
  };

  return (
    <div className="min-height-screen w-full flex items-center justify-center bg-gradient-to-br from-bg-slate via-white to-miss/10 px-4 py-16 flex-1">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md p-8 glass rounded-2xl text-center relative overflow-hidden"
      >
        {/* Navy styling accent lines */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-navy via-ocean to-miss" />

        <div className="mb-8 mt-2">
          {/* Animated SVG Silhouette of a Battleship */}
          <motion.svg 
            initial={{ scale: 0.9, opacity: 0.8 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ repeat: Infinity, duration: 3, repeatType: "reverse" }}
            className="w-24 h-12 mx-auto text-navy" 
            viewBox="0 0 24 12" 
            fill="currentColor"
          >
            <path d="M2,8 L22,8 L20,3 L15,3 L14,1 L10,1 L9,3 L4,3 Z" />
            <rect x="1" y="9" width="22" height="2" rx="1" />
          </motion.svg>
          
          <h1 className="text-4xl font-extrabold tracking-tight text-navy mt-4 mb-2">
            BATTLESHIP
          </h1>
          <p className="text-sm font-medium tracking-wide uppercase text-ocean">
            Multiplayer Naval Combat
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="text-left">
            <label className="block text-xs font-bold text-navy uppercase tracking-wider mb-2">
              Admiral Nickname
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name..."
              maxLength={15}
              disabled={isAuthenticating}
              className="w-full px-4 py-3 rounded-lg border border-navy/20 bg-white/50 text-navy-dark placeholder-navy/40 focus:outline-none focus:ring-2 focus:ring-ocean focus:border-transparent transition-all"
            />
            {error && (
              <motion.p 
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xs font-semibold text-hit mt-2"
              >
                {error}
              </motion.p>
            )}
          </div>

          <button
            type="submit"
            disabled={isAuthenticating}
            className="w-full py-3.5 bg-navy hover:bg-navy/90 text-white font-bold rounded-lg shadow-lg hover:shadow-xl transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isAuthenticating ? (
              <span className="inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              'Deploy Fleet'
            )}
          </button>

          {showWakingNotice && (
            <motion.p
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xs font-semibold text-ocean animate-pulse text-center mt-3"
            >
              The free-tier server is booting up. This first request may take up to 60 seconds. Thank you for your patience!
            </motion.p>
          )}
        </form>

        <div className="mt-8 pt-6 border-t border-navy/10 text-xs text-navy/60">
          No registration required. Enter a name to play immediately.
        </div>
      </motion.div>
    </div>
  );
}
