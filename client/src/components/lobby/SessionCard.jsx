import { motion } from 'framer-motion';

export default function SessionCard({ session, onJoin }) {
  const { id, session_name, grid_size, ship_config, host_name } = session;

  // Format ship config label
  const getShipConfigLabel = (config) => {
    const totalShips = Object.values(config).reduce((a, b) => a + b, 0);
    if (totalShips === 5) return 'Classic Fleet';
    if (totalShips === 4) return 'Mini Fleet';
    if (totalShips > 5) return 'Mega Fleet';
    return `${totalShips} Ships`;
  };

  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="p-5 bg-white rounded-xl border border-navy/10 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
    >
      <div>
        <div className="flex justify-between items-start mb-3">
          <span className="px-2 py-0.5 bg-ocean/10 text-ocean text-xs font-bold rounded-md">
            {grid_size} × {grid_size} Grid
          </span>
          <span className="text-xs text-navy/50 font-semibold">1/2 Players</span>
        </div>

        <h3 className="text-lg font-bold text-navy-dark line-clamp-1 mb-1">
          {session_name}
        </h3>
        <p className="text-xs text-navy/60 font-medium mb-3">
          Host: <span className="text-navy font-bold">{host_name}</span>
        </p>

        <div className="flex items-center gap-2 text-xs text-navy/70 font-semibold mb-4 bg-bg-slate p-2 rounded-lg">
          <svg className="w-4 h-4 text-ocean" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          {getShipConfigLabel(ship_config)}
        </div>
      </div>

      <button
        onClick={() => onJoin(id)}
        className="w-full py-2 bg-ocean hover:bg-ocean/90 text-white font-bold text-sm rounded-lg transition-all cursor-pointer shadow-sm hover:shadow"
      >
        Join Battle
      </button>
    </motion.div>
  );
}
