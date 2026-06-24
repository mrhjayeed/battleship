import { useState, useEffect } from 'react';
import { useGame } from '../../context/GameContext.jsx';
import { useTimer } from '../../hooks/useTimer.js';
import { SHIP_TYPES, generateRandomPlacements, getShipCells } from '../../utils/shipUtils.js';
import { getColLabel } from '../../utils/gridUtils.js';

export default function ShipPlacement() {
  const { gridSize, shipConfig, placeShips, lastEvent, setLastEvent, myBoard } = useGame();
  const [placedShips, setPlacedShips] = useState([]);
  const [selectedShipType, setSelectedShipType] = useState(null);
  const [rotation, setRotation] = useState('h'); // 'h' | 'v'
  const [hoveredCell, setHoveredCell] = useState(null); // { row, col }

  // Extract list of all ships that need to be placed
  const totalShipsToPlace = [];
  if (shipConfig) {
    for (const [type, count] of Object.entries(shipConfig)) {
      for (let i = 0; i < count; i++) {
        totalShipsToPlace.push(type);
      }
    }
  }

  // Determine which ships are not yet placed
  const getUnplacedShips = () => {
    const placedCounts = {};
    for (const ship of placedShips) {
      placedCounts[ship.type] = (placedCounts[ship.type] || 0) + 1;
    }

    const unplaced = [];
    for (const type of totalShipsToPlace) {
      const placedCount = placedCounts[type] || 0;
      // Find occurrences of this type
      const occurrences = totalShipsToPlace.filter(t => t === type).length;
      if (placedCount < occurrences) {
        // Only push if not already accounted for
        const currentCountInUnplaced = unplaced.filter(t => t === type).length;
        if (currentCountInUnplaced < (occurrences - placedCount)) {
          unplaced.push(type);
        }
      }
    }
    return unplaced;
  };

  const unplacedShips = getUnplacedShips();

  // Auto-select next available ship type
  useEffect(() => {
    if (unplacedShips.length > 0 && !unplacedShips.includes(selectedShipType)) {
      setSelectedShipType(unplacedShips[0]);
    } else if (unplacedShips.length === 0) {
      setSelectedShipType(null);
    }
  }, [placedShips, unplacedShips, selectedShipType]);

  // Handle hotkeys (R for rotation)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'r' || e.key === 'R') {
        setRotation((prev) => (prev === 'h' ? 'v' : 'h'));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Listen to auto-place event from server/timeout
  useEffect(() => {
    if (lastEvent && lastEvent.type === 'auto-placed') {
      handleAutoPlace();
      setLastEvent(null);
    }
  }, [lastEvent]);

  // 90s placing timer
  const { timeLeft } = useTimer(90, () => {
    console.log('Placement timer expired! Auto-submitting.');
    const randomPlacements = generateRandomPlacements(gridSize, shipConfig);
    setPlacedShips(randomPlacements);
    placeShips(randomPlacements);
  });

  const handleAutoPlace = () => {
    const randomPlacements = generateRandomPlacements(gridSize, shipConfig);
    setPlacedShips(randomPlacements);
  };

  const handleReset = () => {
    setPlacedShips([]);
  };

  const getHoveredShipCells = () => {
    if (!selectedShipType || !hoveredCell) return [];
    const size = SHIP_TYPES[selectedShipType].size;
    return getShipCells({
      x: hoveredCell.col,
      y: hoveredCell.row,
      size,
      direction: rotation
    });
  };

  const isPlacementValid = (cells) => {
    if (cells.length === 0) return false;

    // Check boundary
    for (const cell of cells) {
      if (cell.x < 0 || cell.x >= gridSize || cell.y < 0 || cell.y >= gridSize) {
        return false;
      }
    }

    // Check overlap with already placed ships
    const occupied = new Set();
    for (const ship of placedShips) {
      const shipCells = getShipCells(ship);
      for (const c of shipCells) {
        occupied.add(`${c.x},${c.y}`);
      }
    }

    for (const cell of cells) {
      if (occupied.has(`${cell.x},${cell.y}`)) {
        return false;
      }
    }

    return true;
  };

  const handleCellClick = (row, col) => {
    // If clicking on an already placed ship, remove it
    const clickedPlacedIndex = placedShips.findIndex((ship) => 
      getShipCells(ship).some(cell => cell.y === row && cell.x === col)
    );

    if (clickedPlacedIndex !== -1) {
      const removed = placedShips[clickedPlacedIndex];
      setPlacedShips((prev) => prev.filter((_, idx) => idx !== clickedPlacedIndex));
      setSelectedShipType(removed.type);
      return;
    }

    if (!selectedShipType) return;

    const cells = getHoveredShipCells();
    if (!isPlacementValid(cells)) return;

    const size = SHIP_TYPES[selectedShipType].size;
    const newShip = {
      type: selectedShipType,
      x: col,
      y: row,
      size,
      direction: rotation
    };

    setPlacedShips((prev) => [...prev, newShip]);
  };

  const handleConfirm = () => {
    if (placedShips.length === totalShipsToPlace.length) {
      placeShips(placedShips);
    }
  };

  const hoveredCells = getHoveredShipCells();
  const isValid = isPlacementValid(hoveredCells);

  // Helper to map placed ships into 2D coordinates for rendering
  const getPlacedGridState = () => {
    const grid = Array(gridSize).fill(null).map(() => Array(gridSize).fill(null));
    for (const ship of placedShips) {
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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-6xl mx-auto items-start p-4">
      {/* Sidebar Controls */}
      <div className="lg:col-span-4 bg-white p-6 rounded-2xl border border-navy/10 shadow-sm space-y-6">
        <div>
          <div className="flex justify-between items-center mb-1">
            <h2 className="text-xl font-bold text-navy-dark">Deploy Fleet</h2>
            <span className={`px-2 py-0.5 rounded text-xs font-bold ${
              timeLeft < 15 ? 'bg-hit/15 text-hit animate-pulse' : 'bg-ocean/10 text-ocean'
            }`}>
              {timeLeft}s remaining
            </span>
          </div>
          <p className="text-xs text-navy/60 font-medium">Position your warships on the tactical grid</p>
        </div>

        {/* Rotation Toggle */}
        <div className="flex items-center justify-between bg-bg-slate p-3 rounded-lg">
          <span className="text-xs font-bold text-navy uppercase tracking-wider">Orientation</span>
          <button
            onClick={() => setRotation(r => r === 'h' ? 'v' : 'h')}
            disabled={myBoard !== null}
            className="px-4 py-1.5 bg-white border border-navy/10 hover:border-navy/20 text-navy font-bold text-xs rounded shadow-sm cursor-pointer transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:pointer-events-none"
          >
            <span>{rotation === 'h' ? 'Horizontal (━)' : 'Vertical (┃)'}</span>
            <span className="text-[10px] bg-navy/10 px-1 rounded text-navy-dark">R</span>
          </button>
        </div>

        {/* Ship Pool */}
        <div>
          <span className="block text-xs font-bold text-navy uppercase tracking-wider mb-3">WARSHIPS TO DEPLOY</span>
          <div className="space-y-2">
            {unplacedShips.length === 0 ? (
              <p className="text-sm font-semibold text-victory bg-victory/5 border border-victory/10 p-4 rounded-xl text-center animate-pulse">
                {myBoard ? 'Waiting for opponent deployments...' : 'All warships successfully deployed. Confirm launch.'}
              </p>
            ) : (
              // De-duplicate types to render selector options
              Array.from(new Set(unplacedShips)).map((type) => {
                const count = unplacedShips.filter(t => t === type).length;
                const details = SHIP_TYPES[type];
                const isSelected = selectedShipType === type;
                return (
                  <button
                    key={type}
                    onClick={() => setSelectedShipType(type)}
                    disabled={myBoard !== null}
                    className={`w-full p-3 rounded-xl border flex items-center justify-between text-left cursor-pointer transition-all ${
                      isSelected
                        ? 'border-ocean bg-ocean/5 text-ocean shadow-sm'
                        : 'border-navy/5 bg-white hover:border-navy/15 text-navy-dark'
                    } ${myBoard ? 'opacity-50 pointer-events-none' : ''}`}
                  >
                    <div>
                      <span className="text-sm font-bold block">{details.name}</span>
                      <span className="text-[10px] text-navy/40 font-bold block">Size: {details.size} cells</span>
                    </div>
                    <span className="px-2 py-0.5 bg-navy/5 text-navy font-bold text-xs rounded-md">
                      ×{count}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleAutoPlace}
            disabled={myBoard !== null}
            className="py-2.5 bg-ocean/10 hover:bg-ocean/15 border border-ocean/20 text-ocean font-bold text-xs rounded-lg cursor-pointer transition-all shadow-sm disabled:opacity-50 disabled:pointer-events-none"
          >
            Auto-Place
          </button>
          <button
            onClick={handleReset}
            disabled={myBoard !== null}
            className="py-2.5 bg-hit/5 hover:bg-hit/10 border border-hit/15 text-hit font-bold text-xs rounded-lg cursor-pointer transition-all disabled:opacity-50 disabled:pointer-events-none"
          >
            Reset Board
          </button>
        </div>

        <button
          onClick={handleConfirm}
          disabled={placedShips.length !== totalShipsToPlace.length || myBoard !== null}
          className="w-full py-3.5 bg-navy hover:bg-navy/95 disabled:opacity-40 text-white font-extrabold text-sm rounded-lg shadow-md cursor-pointer transition-all flex items-center justify-center gap-2"
        >
          {myBoard ? (
            <>
              <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              <span>Waiting for Opponent...</span>
            </>
          ) : (
            'Confirm Deployments'
          )}
        </button>
      </div>

      {/* Grid Canvas */}
      <div className={`lg:col-span-8 flex justify-center ${myBoard ? 'pointer-events-none select-none' : ''}`}>
        <div className="bg-white p-6 rounded-2xl border border-navy/10 shadow-sm relative overflow-hidden">
          {myBoard && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-xs z-20 flex flex-col items-center justify-center p-6 text-center animate-fade-in">
              <div className="w-12 h-12 border-4 border-navy/20 border-t-navy rounded-full animate-spin mb-4" />
              <h3 className="text-lg font-bold text-navy-dark">Deployments Confirmed</h3>
              <p className="text-xs text-navy/60 max-w-xs mt-1">
                Your fleet coordinates are locked. Waiting for the enemy commander to finish their deployments.
              </p>
            </div>
          )}
          <div className="flex flex-col select-none">
            {/* Top Coordinate Header (A, B, C...) */}
            <div className="flex pl-8 mb-2">
              {Array(gridSize).fill(null).map((_, idx) => {
                const cellWidthClass = gridSize > 10 ? 'w-6 sm:w-8' : 'w-8 sm:w-10';
                return (
                  <div key={idx} className={`${cellWidthClass} h-6 flex items-center justify-center font-heading font-bold text-xs text-navy/40`}>
                    {getColLabel(idx)}
                  </div>
                );
              })}
            </div>

            {/* Grid rows */}
            {Array(gridSize).fill(null).map((_, rIdx) => {
              const cellHeightClass = gridSize > 10 ? 'h-6 sm:h-8' : 'h-8 sm:h-10';
              return (
                <div key={rIdx} className="flex">
                  {/* Left Coordinate Header (1, 2, 3...) */}
                  <div className={`w-8 ${cellHeightClass} flex items-center justify-center font-heading font-bold text-xs text-navy/40 pr-2`}>
                    {rIdx + 1}
                  </div>

                  {/* Cells */}
                  {Array(gridSize).fill(null).map((_, cIdx) => {
                    const placedShip = placedGridState[rIdx][cIdx];
                    
                    // Check if cell is hovered as part of current placement validation
                    const isHovered = hoveredCells.some(cell => cell.y === rIdx && cell.x === cIdx);

                    let cellColor = 'bg-white hover:bg-navy/5';
                    if (placedShip) {
                      cellColor = 'bg-navy text-white/90 border-navy/30';
                    }

                    if (isHovered) {
                      cellColor = isValid ? 'bg-victory/30 border-victory' : 'bg-hit/30 border-hit';
                    }

                    const cellWidthClass = gridSize > 10 ? 'w-6 sm:w-8' : 'w-8 sm:w-10';
                    const shipTextSize = gridSize > 10 ? 'text-[5px]' : 'text-[7px]';

                    return (
                      <div
                        key={cIdx}
                        onMouseEnter={() => setHoveredCell({ row: rIdx, col: cIdx })}
                        onMouseLeave={() => setHoveredCell(null)}
                        onClick={() => handleCellClick(rIdx, cIdx)}
                        className={`${cellWidthClass} ${cellHeightClass} border border-navy/10 flex items-center justify-center cursor-pointer transition-all relative ${cellColor}`}
                      >
                        {/* Show placement silhouettes */}
                        {placedShip && (
                          <div className="absolute inset-1 rounded-sm bg-navy/20 border border-navy/40 flex items-center justify-center">
                            <span className={`${shipTextSize} font-extrabold uppercase opacity-85 select-none tracking-tighter`}>
                              {placedShip.type.slice(0, 3)}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
          <div className="mt-4 text-center text-xs text-navy/40 font-medium">
            💡 Tap a placed ship on the grid to recall it. Tap 'R' or use the toggle to rotate.
          </div>
        </div>
      </div>
    </div>
  );
}
