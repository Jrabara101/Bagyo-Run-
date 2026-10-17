import { afterEach, describe, expect, it } from 'vitest';
import Database from 'better-sqlite3';
import { rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import type { FastifyInstance } from 'fastify';
import { openDb, Db } from '../server/db';
import { buildApp } from '../server/app';
import { dailyChallenge, manilaDateKey } from '../shared/sim/daily';
import type { DailyChallenge, GhostTrack, LeaderboardRecord, RunVerifyResponse } from '../shared/sim/types';
import { submission } from './autopilot';

// 2026-10-20 08:30 in Manila is 2026-10-20 00:30 UTC
const NOW = Date.UTC(2026, 9, 20, 0, 30);

let app: FastifyInstance;
let db: Db;
async function start() {
  db = openDb(':memory:');
  app = await buildApp(db, { now: () => NOW });
}
afterEach(async () => {
  await app?.close();
  db?.close();
});

async function post(payload: object) {
  const res = await app.inject({ method: 'POST', url: '/api/runs', payload });
  return { status: res.statusCode, body: res.json() as RunVerifyResponse };
}

describe('daily challenge', () => {
  it('uses the date in Manila, not UTC', () => {
    expect(manilaDateKey(Date.UTC(2026, 9, 19, 15, 59))).toBe('2026-10-19'); // 23:59 Manila
    expect(manilaDateKey(Date.UTC(2026, 9, 19, 16, 0))).toBe('2026-10-20'); // midnight Manila
    expect(manilaDateKey(Date.UTC(2028, 1, 28, 20, 0))).toBe('2028-02-29'); // leap day
  });

  it('is the same for everyone on a date and changes the next day', () => {
    const a = dailyChallenge('2026-10-20');
    expect(dailyChallenge('2026-10-20')).toEqual(a);
    expect(a.seed).toBe('BAGYO-2026-10-20');
    expect(a.storm.en).toMatch(/^Typhoon /);
    expect(a.storm.fil).toMatch(/^Bagyong /);
    expect(dailyChallenge('2026-10-21').seed).not.toBe(a.seed);
  });

  it('GET /api/daily returns the same challenge the client works out offline', async () => {
    await start();
    const body = (await app.inject({ url: '/api/daily' })).json() as DailyChallenge;
    expect(body).toMatchObject(dailyChallenge('2026-10-20'));
    expect(body.topRun).toBeUndefined();
  });
});

describe('runs and leaderboard', () => {
  it('starts empty: no pre-seeded runs', async () => {
    await start();
    const body = (await app.inject({ url: '/api/leaderboard' })).json() as { records: LeaderboardRecord[] };
    expect(body.records).toEqual([]);
  });

  it('stores the server replay result and ranks it', async () => {
    await start();
    const { payload, score } = submission('BAGYO-2026-10-20');
    const { status, body } = await post({ ...payload, playerName: '  Maria <3 ' });
    expect(status).toBe(200);
    expect(body).toMatchObject({ verified: true, code: 'saved', rank: 1 });
    expect(body.result?.score).toBe(score);

    const board = (await app.inject({ url: '/api/leaderboard?seed=BAGYO-2026-10-20' })).json() as { records: LeaderboardRecord[] };
    expect(board.records).toHaveLength(1);
    expect(board.records[0]).toMatchObject({ playerName: 'Maria 3', score, finished: true, gatesTotal: 8 });

    const daily = (await app.inject({ url: '/api/daily' })).json() as DailyChallenge;
    expect(daily.topRun).toEqual({ playerName: 'Maria 3', score });
  });

  it("lists each player's best run once", async () => {
    await start();
    const { payload } = submission('BAGYO-2026-10-20');
    await post({ ...payload, playerName: 'Ana' });
    await post({ ...payload, playerName: 'ana' }); // same player, same score
    const second = await post({ ...payload, playerName: 'Ben' });
    expect(second.body.rank).toBe(1); // a tie is not "better"
    const board = (await app.inject({ url: '/api/leaderboard' })).json() as { records: LeaderboardRecord[] };
    expect(board.records.map((r) => r.playerName)).toEqual(['Ana', 'Ben']);
  });

  it('refuses practice runs, bad payloads and old rules with a code', async () => {
    await start();
    const { payload } = submission('PRACTICE');
    expect((await post(payload)).body).toEqual({ verified: false, code: 'bad_seed' });
    expect((await post({ ...payload, seed: 'X1', rulesVersion: 0 })).body).toEqual({ verified: false, code: 'old_rules' });
    const res = await post({ ...payload, seed: 'X1', ticks: 10 });
    expect(res.status).toBe(422);
    expect(res.body.code).toBe('not_ended');
  });

  it('serves a ghost replayed from the stored inputs', async () => {
    await start();
    const { payload } = submission('GHOST-SEED');
    const { body } = await post({ ...payload, playerName: 'Ghosty' });
    const ghost = (await app.inject({ url: `/api/runs/${body.runId}/ghost` })).json() as GhostTrack;
    expect(ghost).toMatchObject({ runId: body.runId, playerName: 'Ghosty', seed: 'GHOST-SEED' });
    expect(ghost.points.at(-1)!.z).toBeGreaterThanOrEqual(2500);
    expect((await app.inject({ url: '/api/runs/nope/ghost' })).statusCode).toBe(404);
  });
});

describe('schema migration', () => {
  it('moves the old Neon Chasm tables aside instead of deleting them', () => {
    const path = join(tmpdir(), `takbo-migrate-${process.pid}-${Date.now()}.sqlite`);
    const old = new Database(path);
    old.exec(`CREATE TABLE runs (id TEXT PRIMARY KEY, player_name TEXT, coins INTEGER);
              INSERT INTO runs VALUES ('run_ace_01', 'CYBER_VEX', 210);
              CREATE TABLE telemetry_logs (run_id TEXT PRIMARY KEY, telemetry_json TEXT);`);
    old.close();

    const migrated = openDb(path);
    const legacy = migrated.prepare('SELECT player_name FROM legacy_v1_runs').all();
    expect(legacy).toEqual([{ player_name: 'CYBER_VEX' }]);
    expect(migrated.prepare('SELECT count(*) AS n FROM runs').get()).toEqual({ n: 0 });
    migrated.close();
    // Opening again is a no-op
    const again = openDb(path);
    expect(again.pragma('user_version', { simple: true })).toBe(2);
    again.close();
    for (const suffix of ['', '-wal', '-shm']) rmSync(path + suffix, { force: true });
  });
});
