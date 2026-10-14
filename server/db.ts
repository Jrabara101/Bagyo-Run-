import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.resolve(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'runner.sqlite');
export const db = new Database(dbPath);

// Enable WAL mode for high performance concurrency
db.pragma('journal_mode = WAL');

// Initialize database schema
db.exec(`
  CREATE TABLE IF NOT EXISTS runs (
    id TEXT PRIMARY KEY,
    player_name TEXT NOT NULL,
    seed TEXT NOT NULL,
    distance INTEGER NOT NULL,
    score INTEGER NOT NULL,
    coins INTEGER NOT NULL,
    near_misses INTEGER NOT NULL,
    max_combo REAL NOT NULL,
    duration_ms INTEGER NOT NULL,
    verified INTEGER NOT NULL DEFAULT 1,
    validation_reason TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS telemetry_logs (
    run_id TEXT PRIMARY KEY,
    telemetry_json TEXT NOT NULL,
    FOREIGN KEY(run_id) REFERENCES runs(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS daily_seeds (
    date_key TEXT PRIMARY KEY,
    seed TEXT NOT NULL,
    title TEXT NOT NULL,
    modifiers_json TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_runs_seed ON runs(seed, distance DESC);
  CREATE INDEX IF NOT EXISTS idx_runs_score ON runs(score DESC);
`);

// Seed default high scores for rich first-time display if empty
const count = db.prepare('SELECT count(*) as count FROM runs').get() as { count: number };
if (count.count === 0) {
  const insertRun = db.prepare(`
    INSERT INTO runs (id, player_name, seed, distance, score, coins, near_misses, max_combo, duration_ms, verified, validation_reason)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'Pre-seeded Ace Pilot')
  `);

  const initialPilots = [
    { id: 'run_ace_01', name: 'CYBER_VEX', seed: 'SEED-DAILY-GAUNTLET', dist: 5420, score: 98450, coins: 210, near: 48, combo: 4.5, dur: 124000 },
    { id: 'run_ace_02', name: 'NEO_PHANTOM', seed: 'SEED-DAILY-GAUNTLET', dist: 4890, score: 79200, coins: 184, near: 36, combo: 3.8, dur: 112000 },
    { id: 'run_ace_03', name: 'APEX_KINETIC', seed: 'SEED-DAILY-GAUNTLET', dist: 4120, score: 63500, coins: 152, near: 29, combo: 3.2, dur: 95000 },
    { id: 'run_ace_04', name: 'SOLAR_RUNNER', seed: 'SEED-DAILY-GAUNTLET', dist: 3560, score: 51200, coins: 128, near: 22, combo: 2.5, dur: 82000 },
    { id: 'run_ace_05', name: 'VOID_WALKER', seed: 'SEED-DAILY-GAUNTLET', dist: 2840, score: 39800, coins: 95, near: 18, combo: 2.0, dur: 68000 },
  ];

  for (const p of initialPilots) {
    insertRun.run(p.id, p.name, p.seed, p.dist, p.score, p.coins, p.near, p.combo, p.dur);

    // Create synthetic ghost telemetry for top pilot NEO_PHANTOM so ghost runner is immediately active!
    const mockTelemetry: { timeMs: number; action: string; lane: number; y: number; z: number }[] = [];
    let curZ = 0;
    let curLane = 1;
    for (let t = 0; t <= p.dur; t += 100) {
      curZ += (p.dist / (p.dur / 1000)) * 0.1;
      if (t % 3200 === 0) curLane = ((curLane + 1) % 3);
      mockTelemetry.push({
        timeMs: t,
        action: 'tick',
        lane: curLane,
        y: 0,
        z: Math.floor(curZ),
      });
    }

    db.prepare('INSERT INTO telemetry_logs (run_id, telemetry_json) VALUES (?, ?)').run(
      p.id,
      JSON.stringify(mockTelemetry)
    );
  }
}
