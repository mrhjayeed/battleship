export const SHIP_TYPES = {
  carrier: { name: 'Carrier', size: 5, color: '#1F2937' },
  battleship: { name: 'Battleship', size: 4, color: '#374151' },
  cruiser: { name: 'Cruiser', size: 3, color: '#4B5563' },
  submarine: { name: 'Submarine', size: 3, color: '#6B7280' },
  destroyer: { name: 'Destroyer', size: 2, color: '#9CA3AF' }
};

export const SHIP_PRESETS = {
  classic: {
    carrier: 1,
    battleship: 1,
    cruiser: 1,
    submarine: 1,
    destroyer: 1
  },
  mini: {
    battleship: 1,
    cruiser: 1,
    destroyer: 2
  },
  mega: {
    carrier: 1,
    battleship: 2,
    cruiser: 2,
    submarine: 2,
    destroyer: 3
  }
};

export function getShipCells(ship) {
  const cells = [];
  const { x, y, size, direction } = ship;
  for (let i = 0; i < size; i++) {
    if (direction === 'h') {
      cells.push({ x: x + i, y });
    } else {
      cells.push({ x, y: y + i });
    }
  }
  return cells;
}

export function getFleetCoverage(shipConfig, gridSize) {
  let totalSize = 0;
  for (const [type, count] of Object.entries(shipConfig)) {
    const size = SHIP_TYPES[type]?.size || 0;
    totalSize += size * count;
  }
  const totalCells = gridSize * gridSize;
  return Math.round((totalSize / totalCells) * 100);
}

export function generateRandomPlacements(gridSize, shipConfig) {
  const ships = [];
  const occupied = new Set();

  const types = [];
  for (const [type, count] of Object.entries(shipConfig)) {
    for (let i = 0; i < count; i++) {
      types.push(type);
    }
  }

  // Sort descending by size
  types.sort((a, b) => SHIP_TYPES[b].size - SHIP_TYPES[a].size);

  for (const type of types) {
    const size = SHIP_TYPES[type].size;
    let placed = false;
    let attempts = 0;

    while (!placed && attempts < 200) {
      attempts++;
      const direction = Math.random() < 0.5 ? 'h' : 'v';
      const maxX = direction === 'h' ? gridSize - size : gridSize - 1;
      const maxY = direction === 'v' ? gridSize - size : gridSize - 1;

      const x = Math.floor(Math.random() * (maxX + 1));
      const y = Math.floor(Math.random() * (maxY + 1));

      const newShip = { type, x, y, size, direction };
      const cells = getShipCells(newShip);

      let overlaps = false;
      for (const cell of cells) {
        if (occupied.has(`${cell.x},${cell.y}`)) {
          overlaps = true;
          break;
        }
      }

      if (!overlaps) {
        ships.push(newShip);
        for (const cell of cells) {
          occupied.add(`${cell.x},${cell.y}`);
        }
        placed = true;
      }
    }

    if (!placed) {
      // Retry
      return generateRandomPlacements(gridSize, shipConfig);
    }
  }

  return ships;
}
