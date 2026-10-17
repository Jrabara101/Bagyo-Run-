import type { LeaderboardRecord, RunResult } from '../../shared/sim/types';

const KEY = 'bagyo-local-runs';
const KEEP = 40;

function read(): LeaderboardRecord[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Keeps this device's best runs so the leaderboard still shows something with no server
 * (offline screening, venue Wi-Fi down). These are never sent anywhere.
 */
export function saveLocalRun(result: RunResult, playerName: string) {
  const run: LeaderboardRecord = {
    id: `local-${Date.now()}`,
    playerName: playerName || 'RUNNER',
    seed: result.seed,
    score: result.score,
    distance: result.distance,
    finished: result.finished,
    heartsLeft: result.heartsLeft,
    gatesCorrect: result.gatesCorrect,
    gatesTotal: result.gatesTotal,
    goBagCount: result.goBagCount,
    createdAt: new Date().toISOString(),
  };
  const runs = [...read(), run].sort((a, b) => b.score - a.score).slice(0, KEEP);
  try {
    localStorage.setItem(KEY, JSON.stringify(runs));
  } catch {
    // Storage blocked or full: the run is simply not remembered
  }
}

/** Best run per name (and seed), highest first, like the server's board. */
export function localBoard(seed?: string): LeaderboardRecord[] {
  const seen = new Set<string>();
  return read()
    .filter((r) => !seed || r.seed === seed)
    .filter((r) => {
      const key = `${r.playerName.toLowerCase()}|${r.seed}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}
