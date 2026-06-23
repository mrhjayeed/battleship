import { useGame } from '../../context/GameContext.jsx';
import { getShipCells } from '../../utils/shipUtils.js';
import { getColLabel } from '../../utils/gridUtils.js';

export default function GameBoard() {
  const { gridSize, myBoard, opponentShots } = useGame();

  // Create 2D array representation of placed ships
  const getPlacedGridState = () => {
    const grid = Array(gridSize).fill(null).map(() => Array(gridSize).fill(null));
    if (!myBoard) return grid;
    
    for (const ship of myBoard) {
      const cells = getShipCells(ship);
      for (const cell of cells) {
        if (cell.x >= 0 && cell.x < gridSize && cell.y >= 0 && cell.y < gridSize) {
          grid[cell.y][cell.x] = ship;
        }
      }
    }
    return grid;
  };

  const placedGridState = getPlacedGridState();

  // Map opponent shots for quick lookup
  const getShotMap = () => {
    const map = new Map();
    for (const shot of opponentShots) {
      map.set(`${shot.row},${shot.col}`, shot);
    }
    return map;
  };

  const shotMap = getShotMap();

  return (
    <div className="bg-white p-4 rounded-2xl border border-navy/10 shadow-sm flex flex-col items-center">
      <div className="mb-3">
        <h3 className="text-sm font-bold text-navy text-center uppercase tracking-wider">Defensive Grid (My Fleet)</h3>
      </div>
      
      <div className="flex flex-col select-none">
        {/* Top Header Labels (A, B...) */}
        <div className="flex pl-8 mb-2">
          {Array(gridSize).fill(null).map((_, idx) => (
            <div key={idx} className="w-8 sm:w-9 h-5 flex items-center justify-center font-heading font-bold text-[10px] text-navy/40">
              {getColLabel(idx)}
            </div>
          ))}
        </div>

        {/* Rows */}
        {Array(gridSize).fill(null).map((_, rIdx) => (
          <div key={rIdx} className="flex">
            {/* Left Header Labels (1, 2...) */}
            <div className="w-8 h-8 sm:h-9 flex items-center justify-center font-heading font-bold text-[10px] text-navy/40 pr-2">
              {rIdx + 1}
            </div>

            {/* Cells */}
            {Array(gridSize).fill(null).map((_, cIdx) => {
              const placedShip = placedGridState[rIdx][cIdx];
              const shot = shotMap.get(`${rIdx},${cIdx}`);

              let cellStyle = 'bg-white border-navy/10';
              let contents = null;

              if (placedShip) {
                // Own ship cell (Navy accent colors)
                cellStyle = 'bg-navy/10 border-navy/20';
                contents = (
                  <div className="absolute inset-1 rounded-sm bg-navy/20 border border-navy/30 flex items-center justify-center">
                    <span className="text-[6px] font-extrabold uppercase text-navy/80 tracking-tighter">
                      {placedShip.type.slice(0, 3)}
                    </span>
                  </div>
                );
              }

              if (shot) {
                if (shot.result === 'hit') {
                  cellStyle = 'bg-hit/15 border-hit/30 animate-pulse-hit';
                  contents = (
                    <div className="absolute inset-1.5 rounded-sm bg-hit border border-hit/80 flex items-center justify-center shadow-inner">
                      <span className="text-white text-[8px] font-bold">💥</span>
                    </div>
                  );
                } else {
                  cellStyle = 'bg-miss/15 border-miss/30 animate-pulse-miss';
                  contents = (
                    <div className="w-2.5 h-2.5 rounded-full bg-miss border border-miss/80 shadow" />
                  );
                }
              }

              return (
                <div
                  key={cIdx}
                  className={`w-8 h-8 sm:w-9 sm:h-9 border flex items-center justify-center relative ${cellStyle}`}
                >
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
