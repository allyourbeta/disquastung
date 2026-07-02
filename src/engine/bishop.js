// Bishop path-finding. Ported verbatim from legacy/app/routes.py's
// bishop_path / bishop_2_move_path / the branching in api_bishop_new. Faithful
// port: this includes the same-square case producing 2 "moves" with a
// go-out-and-back path (routes.py's file_diff>0 guard skips file_diff===0
// so same-square never hits the 1-move branch) -- do not "fix" this, it
// matches golden fixtures generated from the live Flask logic.
import { FILES, squareToCoord, coordToSquare } from "./board.js";

function diffs(a, b) {
  const fileDiff = Math.abs(FILES.indexOf(a[0]) - FILES.indexOf(b[0]));
  const rankDiff = Math.abs(parseInt(a[1], 10) - parseInt(b[1], 10));
  return { fileDiff, rankDiff };
}

function directPath(start, end) {
  const [sx, sy] = squareToCoord(start);
  const [ex, ey] = squareToCoord(end);
  if (Math.abs(ex - sx) !== Math.abs(ey - sy)) return null;
  if (sx === ex && sy === ey) return [start];
  return [start, end];
}

function twoMovePath(start, end) {
  const [sx, sy] = squareToCoord(start);
  const [ex, ey] = squareToCoord(end);
  for (let mx = 0; mx < 8; mx++) {
    for (let my = 0; my < 8; my++) {
      if (mx === sx && my === sy) continue;
      if (mx === ex && my === ey) continue;

      const dx1 = mx - sx, dy1 = my - sy;
      if (Math.abs(dx1) !== Math.abs(dy1) || dx1 === 0) continue;

      const dx2 = ex - mx, dy2 = ey - my;
      if (Math.abs(dx2) !== Math.abs(dy2) || dx2 === 0) continue;

      return [start, coordToSquare(mx, my), end];
    }
  }
  return null;
}

export function bishopMoves(start, end) {
  const { fileDiff, rankDiff } = diffs(start, end);
  if (fileDiff === rankDiff && fileDiff > 0) return 1;
  if ((fileDiff + rankDiff) % 2 === 0) return 2;
  return -1;
}

export function bishopPath(start, end) {
  const { fileDiff, rankDiff } = diffs(start, end);
  if (fileDiff === rankDiff && fileDiff > 0) return directPath(start, end);
  if ((fileDiff + rankDiff) % 2 === 0) return twoMovePath(start, end);
  return null;
}
