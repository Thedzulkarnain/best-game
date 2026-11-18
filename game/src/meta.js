// Persistent meta: best score, last runs, lifetime totals and permanent
// unlocks. All localStorage access is wrapped in try/catch — a blocked or
// missing store must never break the game.
const KEY = 'starwell_meta_v1';

export function loadMeta() {
  const empty = { best: 0, wins: 0, runs: 0, totalWellKills: 0, starKeeperWins: 0, lastRuns: [] };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty;
    const m = JSON.parse(raw);
    return { ...empty, ...m, lastRuns: Array.isArray(m.lastRuns) ? m.lastRuns.slice(0, 3) : [] };
  } catch { return empty; }
}

export function saveMeta(meta) {
  try { localStorage.setItem(KEY, JSON.stringify(meta)); } catch { /* store unavailable — play on */ }
}

// Record a finished run (win or loss) and return the updated meta.
export function recordRun(meta, run) {
  const entry = {
    won: run.won, score: run.score, wave: run.wave,
    time: Math.round(run.time), kills: run.kills,
    date: new Date().toISOString().slice(0, 10),
  };
  meta.runs += 1;
  if (run.won) meta.wins += 1;
  if (run.won && run.minStarHp >= run.starMaxHp / 2) meta.starKeeperWins += 1;
  meta.totalWellKills += run.stats.wellKills;
  if (run.score > meta.best) meta.best = run.score;
  meta.lastRuns = [entry, ...meta.lastRuns].slice(0, 3);
  saveMeta(meta);
  return meta;
}
