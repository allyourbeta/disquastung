// localStorage stats adapter. One JSON blob, coarse per-square counters only
// (no per-answer log) so storage never grows unbounded.
const KEY = "disquastung-stats";

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

function save(stats) {
  localStorage.setItem(KEY, JSON.stringify(stats));
}

export class LocalAdapter {
  async recordAnswer({ square, correct }) {
    const stats = load();
    if (!stats[square]) stats[square] = { seen: 0, misses: 0, lastMissAt: null };
    stats[square].seen += 1;
    if (!correct) {
      stats[square].misses += 1;
      stats[square].lastMissAt = Date.now();
    }
    save(stats);
  }

  async getSquareStats() {
    return load();
  }

  async resetStats() {
    localStorage.removeItem(KEY);
  }
}
