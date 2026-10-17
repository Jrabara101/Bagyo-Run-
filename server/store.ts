import { randomUUID } from 'crypto';
import type { Db } from './db.js';
import { RULES_VERSION } from '../shared/sim/constants.js';
import type { InputEvent, LeaderboardRecord, RunResult } from '../shared/sim/types.js';

interface RunRow {
  id: string;
  player_name: string;
  seed: string;
  score: number;
  distance: number;
  finished: number;
  hearts_left: number;
  gates_correct: number;
  gates_total: number;
  go_bag: number;
  created_at: string;
}

const toRecord = (r: RunRow): LeaderboardRecord => ({
  id: r.id,
  playerName: r.player_name,
  seed: r.seed,
  score: r.score,
  distance: r.distance,
  finished: r.finished === 1,
  heartsLeft: r.hearts_left,
  gatesCorrect: r.gates_correct,
  gatesTotal: r.gates_total,
  goBagCount: r.go_bag,
  createdAt: r.created_at,
});

/** Stores a verified run with its input log. Returns the new run id. */
export function saveRun(db: Db, playerName: string, result: RunResult, inputLog: InputEvent[]): string {
  const id = randomUUID();
  db.transaction(() => {
    db.prepare(`
      INSERT INTO runs (id, player_name, seed, rules_version, score, distance, finished, hearts_left,
                        gates_correct, gates_total, go_bag, supplies, near_misses, ticks)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, playerName, result.seed, RULES_VERSION, result.score, result.distance, result.finished ? 1 : 0, result.heartsLeft,
      result.gatesCorrect, result.gatesTotal, result.goBagCount, result.supplies, result.nearMisses, result.ticks
    );
    db.prepare('INSERT INTO run_inputs (run_id, input_log) VALUES (?, ?)').run(id, JSON.stringify(inputLog));
  })();
  return id;
}

/**
 * Top runs under the current rules, each player's best run once (ties go to the earlier run).
 * With a seed: that seed's board. Without: best runs across all seeds.
 */
export function leaderboard(db: Db, seed: string | undefined, limit: number): LeaderboardRecord[] {
  const rows = db.prepare(`
    SELECT * FROM (
      SELECT r.*, ROW_NUMBER() OVER (
        PARTITION BY lower(r.player_name), r.seed ORDER BY r.score DESC, r.created_at ASC
      ) AS nth
      FROM runs r
      WHERE r.rules_version = ? AND (? IS NULL OR r.seed = ?)
    )
    WHERE nth = 1
    ORDER BY score DESC, created_at ASC
    LIMIT ?
  `).all(RULES_VERSION, seed ?? null, seed ?? null, limit) as RunRow[];
  return rows.map(toRecord);
}

/** 1 + the number of other players whose best on this seed beats `score`. */
export function rankOf(db: Db, seed: string, playerName: string, score: number): number {
  const row = db.prepare(`
    SELECT count(*) AS better FROM (
      SELECT lower(player_name) AS p, max(score) AS best FROM runs
      WHERE seed = ? AND rules_version = ? GROUP BY lower(player_name)
    ) WHERE best > ? AND p <> lower(?)
  `).get(seed, RULES_VERSION, score, playerName) as { better: number };
  return row.better + 1;
}

export function topRun(db: Db, seed: string): { playerName: string; score: number } | undefined {
  const row = db.prepare(`
    SELECT player_name, score FROM runs WHERE seed = ? AND rules_version = ?
    ORDER BY score DESC, created_at ASC LIMIT 1
  `).get(seed, RULES_VERSION) as { player_name: string; score: number } | undefined;
  return row && { playerName: row.player_name, score: row.score };
}

/** A stored run's seed, length and inputs, for replaying it as a ghost. */
export function runInputs(db: Db, id: string): { playerName: string; seed: string; ticks: number; inputLog: InputEvent[] } | undefined {
  const row = db.prepare(`
    SELECT r.player_name, r.seed, r.ticks, i.input_log FROM runs r JOIN run_inputs i ON i.run_id = r.id
    WHERE r.id = ? AND r.rules_version = ?
  `).get(id, RULES_VERSION) as { player_name: string; seed: string; ticks: number; input_log: string } | undefined;
  return row && { playerName: row.player_name, seed: row.seed, ticks: row.ticks, inputLog: JSON.parse(row.input_log) };
}
