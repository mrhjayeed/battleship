import { getShipCells } from './ShipLogic.js';

export function getAIShot(difficulty, playerShips, shotsFired, gridSize) {
  // playerShips: opponent ships array [{ type, x, y, size, direction }]
  // shotsFired: shots fired by AI [{ row, col, result }]
  // gridSize: number

  // Create a map of shots fired for quick lookup
  const firedMap = new Set(shotsFired.map(s => `${s.row},${s.col}`));

  // Determine which player ships are sunk
  const sunkShips = [];
  const activeHits = []; // Hits that belong to unsunk ships

  for (const ship of playerShips) {
    const cells = getShipCells(ship);
    const hitCells = cells.filter(cell => firedMap.has(`${cell.y},${cell.x}`));
    
    if (hitCells.length === cells.length) {
      sunkShips.push(ship);
    } else {
      activeHits.push(...hitCells);
    }
  }

  // Helper to check if coordinate is already fired
  const isFired = (r, c) => firedMap.has(`${r},${c}`);

  // Helper to get valid neighbors (up, down, left, right)
  const getNeighbors = (r, c) => {
    const neighbors = [];
    if (r > 0) neighbors.push({ row: r - 1, col: c });
    if (r < gridSize - 1) neighbors.push({ row: r + 1, col: c });
    if (c > 0) neighbors.push({ row: r, col: c - 1 });
    if (c < gridSize - 1) neighbors.push({ row: r, col: c + 1 });
    return neighbors;
  };

  // --- EASY MODE ---
  if (difficulty === 'easy') {
    return getRandomShot(gridSize, isFired);
  }

  // --- MEDIUM MODE ---
  if (difficulty === 'medium') {
    // If there are hits on ships that are not yet sunk, hunt them
    if (activeHits.length > 0) {
      // Find a neighbor of one of the active hits
      for (const hit of activeHits) {
        const neighbors = getNeighbors(hit.y, hit.x);
        const candidates = neighbors.filter(n => !isFired(n.row, n.col));
        if (candidates.length > 0) {
          // Return a random candidate neighbor
          return candidates[Math.floor(Math.random() * candidates.length)];
        }
      }
    }
    // Fallback to random shot
    return getRandomShot(gridSize, isFired);
  }

  // --- HARD MODE (Probability Density Map + Parity Checkerboard) ---
  // Create probability grid
  const probGrid = Array(gridSize).fill(null).map(() => Array(gridSize).fill(0));

  // Determine which ships are unsunk
  const unsunkShips = playerShips.filter(ship => {
    const cells = getShipCells(ship);
    const hitCells = cells.filter(cell => firedMap.has(`${cell.y},${cell.x}`));
    return hitCells.length < cells.length;
  });

  // Calculate probabilities
  for (const ship of unsunkShips) {
    const size = ship.size;

    // Test all horizontal placements
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c <= gridSize - size; c++) {
        let possible = true;
        let hitsCount = 0;

        for (let i = 0; i < size; i++) {
          const row = r;
          const col = c + i;

          // If we fired and missed or if it's a sunk ship cell, we can't place here
          // Wait, we don't know if a shot is a sunk ship cell unless we track sunk ships cells.
          // Let's check: if we hit a ship and it's sunk, we know it.
          // If a shot resulted in a miss, we definitely can't place a ship there.
          const prevShot = shotsFired.find(s => s.row === row && s.col === col);
          if (prevShot && prevShot.result === 'miss') {
            possible = false;
            break;
          }

          // Check if this cell is part of a known sunk ship
          const isSunkCell = sunkShips.some(s => 
            getShipCells(s).some(cell => cell.y === row && cell.x === col)
          );
          if (isSunkCell) {
            possible = false;
            break;
          }

          if (prevShot && prevShot.result === 'hit') {
            hitsCount++;
          }
        }

        if (possible) {
          // Weight placements that contain known hits highly
          const weight = hitsCount > 0 ? Math.pow(20, hitsCount) : 1;
          for (let i = 0; i < size; i++) {
            probGrid[r][c + i] += weight;
          }
        }
      }
    }

    // Test all vertical placements
    for (let r = 0; r <= gridSize - size; r++) {
      for (let c = 0; c < gridSize; c++) {
        let possible = true;
        let hitsCount = 0;

        for (let i = 0; i < size; i++) {
          const row = r + i;
          const col = c;

          const prevShot = shotsFired.find(s => s.row === row && s.col === col);
          if (prevShot && prevShot.result === 'miss') {
            possible = false;
            break;
          }

          const isSunkCell = sunkShips.some(s => 
            getShipCells(s).some(cell => cell.y === row && cell.x === col)
          );
          if (isSunkCell) {
            possible = false;
            break;
          }

          if (prevShot && prevShot.result === 'hit') {
            hitsCount++;
          }
        }

        if (possible) {
          const weight = hitsCount > 0 ? Math.pow(20, hitsCount) : 1;
          for (let i = 0; i < size; i++) {
            probGrid[r + i][c] += weight;
          }
        }
      }
    }
  }

  // Checkerboard parity: prioritize targeting odd/even cells to find ships faster
  // unless we are hunting active hits.
  const isHunting = activeHits.length > 0;

  let bestRow = -1;
  let bestCol = -1;
  let maxProb = -1;

  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      if (isFired(r, c)) continue;

      let prob = probGrid[r][c];

      // If we're not hunting, apply a small boost to checkerboard squares
      if (!isHunting) {
        if ((r + c) % 2 === 0) {
          prob += 0.5; // Small bias to check alternate squares
        }
      }

      if (prob > maxProb) {
        maxProb = prob;
        bestRow = r;
        bestCol = c;
      }
    }
  }

  if (bestRow !== -1 && bestCol !== -1) {
    return { row: bestRow, col: bestCol };
  }

  // Fallback
  return getRandomShot(gridSize, isFired);
}

function getRandomShot(gridSize, isFired) {
  const candidates = [];
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      if (!isFired(r, c)) {
        candidates.push({ row: r, col: c });
      }
    }
  }
  if (candidates.length === 0) return null;
  return candidates[Math.floor(Math.random() * candidates.length)];
}
