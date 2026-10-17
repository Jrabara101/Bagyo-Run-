import Database from 'better-sqlite3';

export type Db = Database.Database;

const SCHEMA_VERSION = 2;

/**
 * Opens (or creates) the leaderboard database. Only server-verified runs are stored: the
 * result columns are the server's own replay of `input_log`, never what the client claimed.
 *
 * Version 1 was the Neon Chasm schema with pre-seeded fake runs. Its tables are renamed to
 * `legacy_*` rather than dropped, so nothing is lost, and they are never read again.
 */
export function openDb(file: string): Db {
  const db = new Database(file);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  const version = db.pragma('user_version', { simple: true }) as number;
  if (version < SCHEMA_VERSION) {
    db.transaction(() => {
      const tables = (db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all() as { name: string }[]).map((t) => t.name);
      for (const old of ['runs', 'telemetry_logs', 'daily_seeds']) {
        if (tables.includes(old)) db.exec(`ALTER TABLE ${old} RENAME TO legacy_v1_${old}`);
      }
      db.exec(`
        CREATE TABLE runs (
          id TEXT PRIMARY KEY,
          player_name TEXT NOT NULL,
          seed TEXT NOT NULL,
          rules_version INTEGER NOT NULL,
          score INTEGER NOT NULL,
          distance INTEGER NOT NULL,
          finished INTEGER NOT NULL,
          hearts_left INTEGER NOT NULL,
          gates_correct INTEGER NOT NULL,
          gates_total INTEGER NOT NULL,
          go_bag INTEGER NOT NULL,
          supplies INTEGER NOT NULL,
          near_misses INTEGER NOT NULL,
          ticks INTEGER NOT NULL,
          created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
        );
        CREATE TABLE run_inputs (
          run_id TEXT PRIMARY KEY REFERENCES runs(id) ON DELETE CASCADE,
          input_log TEXT NOT NULL
        );
        CREATE INDEX idx_runs_board ON runs(seed, rules_version, score DESC);
      `);
      db.pragma(`user_version = ${SCHEMA_VERSION}`);
    })();
  }
  return db;
}
