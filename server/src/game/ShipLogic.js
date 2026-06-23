export const SHIP_SIZES = {
  carrier: 5,
  battleship: 4,
  cruiser: 3,
  submarine: 3,
  destroyer: 2
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

export function validatePlacement(ships, gridSize, shipConfig) {
  // 1. Check if ships is an array
  if (!Array.isArray(ships)) return false;

  // 2. Map of expected counts
  const expectedCounts = { ...shipConfig };
  const actualCounts = {};

  const occupied = new Set();

  for (const ship of ships) {
    const { type, x, y, direction } = ship;
    const size = SHIP_SIZES[type];
    if (!size) return false; // Invalid ship type

    ship.size = size; // Ensure size is correct

    // Track counts
    actualCounts[type] = (actualCounts[type] || 0) + 1;

    // Check bounds
    if (x < 0 || y < 0) return false;
    if (direction === 'h' && x + size > gridSize) return false;
    if (direction === 'v' && y + size > gridSize) return false;

    // Check overlap
    const cells = getShipCells(ship);
    for (const cell of cells) {
      const key = `${cell.x},${cell.y}`;
      if (occupied.has(key)) return false; // Overlap detected
      occupied.add(key);
    }
  }

  // Verify counts match config
  for (const type of Object.keys(expectedCounts)) {
    if (expectedCounts[type] !== (actualCounts[type] || 0)) {
      return false;
    }
  }

  return true;
}

export function generateRandomBoard(gridSize, shipConfig) {
  const ships = [];
  const occupied = new Set();

  const types = [];
  for (const [type, count] of Object.entries(shipConfig)) {
    for (let i = 0; i < count; i++) {
      types.push(type);
    }
  }

  // Sort by size descending to place larger ships first
  types.sort((a, b) => SHIP_SIZES[b] - SHIP_SIZES[a]);

  for (const type of types) {
    const size = SHIP_SIZES[type];
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

      // Check overlap
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
      // If we failed to place, retry generation from scratch
      return generateRandomBoard(gridSize, shipConfig);
    }
  }

  return ships;
}
