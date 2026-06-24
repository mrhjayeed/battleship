import { useGame } from '../../context/GameContext.jsx';
import { getColLabel } from '../../utils/gridUtils.js';

export default function ShotGrid() {
  const { gridSize, myShots, fireShot, currentTurn, role, status } = useGame();

  const isMyTurn = currentTurn === role && status === 'active';

  // Map shots for quick lookup
  const getShotMap = () => {
    const map = new Map();
    for (const shot of myShots) {
      map.set(`${shot.row},${shot.col}`, shot);
    }
    return map;
  };

  const shotMap = getShotMap();

  const handleCellClick = (row, col) => {
    if (!isMyTurn) return;
    if (shotMap.has(`${row},${col}`)) return; // Already shot here
    fireShot(row, col);
  };

  // Dynamic grid scaling based on size to prevent layout breaking
  const cellWidthClass = gridSize > 10 ? 'w-6 sm:w-7' : 'w-8 sm:w-9';
  const cellHeightClass = gridSize > 10 ? 'h-6 sm:h-7' : 'h-8 sm:h-9';
  const emojiSizeClass = gridSize > 10 ? 'text-[6px]' : 'text-[8px]';
  const dotSizeClass = gridSize > 10 ? 'w-1.5 h-1.5' : 'w-2.5 h-2.5';

  return (
    <div className="bg-white p-4 rounded-2xl border border-navy/10 shadow-sm flex flex-col items-center">
      <div className="mb-3">
        <h3 className="text-sm font-bold text-navy text-center uppercase tracking-wider">Tactical Grid (Enemy Territory)</h3>
      </div>

      <div className="flex flex-col select-none">
        {/* Top Header Labels (A, B...) */}
        <div className="flex pl-8 mb-2">
          {Array(gridSize).fill(null).map((_, idx) => (
            <div key={idx} className={`${cellWidthClass} h-5 flex items-center justify-center font-heading font-bold text-[10px] text-navy/40`}>
              {getColLabel(idx)}
            </div>
          ))}
        </div>

        {/* Rows */}
        {Array(gridSize).fill(null).map((_, rIdx) => (
          <div key={rIdx} className="flex">
            {/* Left Header Labels (1, 2...) */}
            <div className={`w-8 ${cellHeightClass} flex items-center justify-center font-heading font-bold text-[10px] text-navy/40 pr-2`}>
              {rIdx + 1}
            </div>

            {/* Cells */}
            {Array(gridSize).fill(null).map((_, cIdx) => {
              const shot = shotMap.get(`${rIdx},${cIdx}`);
              
              let cellStyle = 'bg-white border-navy/10';
              let contents = null;

              if (shot) {
                if (shot.result === 'hit') {
                  cellStyle = 'bg-hit/15 border-hit/30';
                  contents = (
                    <div className="absolute inset-1.5 rounded-sm bg-hit border border-hit/80 flex items-center justify-center shadow-inner animate-pulse-hit">
                      <span className={`text-white ${emojiSizeClass} font-bold`}>💥</span>
                    </div>
                  );
                } else {
                  cellStyle = 'bg-miss/15 border-miss/30';
                  contents = (
                    <div className={`${dotSizeClass} rounded-full bg-miss border border-miss/80 shadow animate-pulse-miss`} />
                  );
                }
              } else if (isMyTurn) {
                // Interactive hover state
                cellStyle = 'bg-white border-navy/10 hover:bg-ocean/10 hover:border-ocean/40 cursor-crosshair';
              }

              return (
                <div
                  key={cIdx}
                  onClick={() => handleCellClick(rIdx, cIdx)}
                  className={`${cellWidthClass} ${cellHeightClass} border flex items-center justify-center relative transition-all ${cellStyle}`}
                >
                  {/* Subtle target crosshair dot on hover if it's our turn and cell is un-targeted */}
                  {!shot && isMyTurn && (
                    <div className="w-1 h-1 rounded-full bg-navy/0 hover:bg-ocean/40 transition-all" />
                  )}
                  {contents}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
