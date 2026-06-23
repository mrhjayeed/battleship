export function getColLabel(colIndex) {
  return String.fromCharCode(65 + colIndex); // 0 -> A, 1 -> B, etc.
}

export function getRowLabel(rowIndex) {
  return (rowIndex + 1).toString(); // 0 -> 1, 1 -> 2, etc.
}

export function getCoordinateLabel(row, col) {
  return `${getColLabel(col)}${getRowLabel(row)}`;
}
