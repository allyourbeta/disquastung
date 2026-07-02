// Knight path-finding. Ported verbatim (BFS, FIFO queue) from
// legacy/app/routes.py:knight_path -- do not "optimize" the traversal.
import { squareToCoord, coordToSquare } from "./board.js";

function knightNeighbors(x, y) {
  return [
    [x + 2, y + 1], [x + 2, y - 1], [x - 2, y + 1], [x - 2, y - 1],
    [x + 1, y + 2], [x + 1, y - 2], [x - 1, y + 2], [x - 1, y - 2],
  ];
}

export function knightPath(start, end) {
  const [sx, sy] = squareToCoord(start);
  const [ex, ey] = squareToCoord(end);
  const queue = [[sx, sy, [start]]];
  const visited = new Set();

  while (queue.length) {
    const [x, y, path] = queue.shift();
    if (x === ex && y === ey) return path;

    const key = x + "," + y;
    if (!visited.has(key)) {
      visited.add(key);
      for (const [nx, ny] of knightNeighbors(x, y)) {
        if (nx >= 0 && nx < 8 && ny >= 0 && ny < 8) {
          queue.push([nx, ny, path.concat(coordToSquare(nx, ny))]);
        }
      }
    }
  }
  return null;
}

export function knightMoves(start, end) {
  return knightPath(start, end).length - 1;
}
