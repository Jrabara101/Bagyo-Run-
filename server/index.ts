import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyWebsocket from '@fastify/websocket';
import { db } from './db.js';
import { SeedDirector } from './seedDirector.js';
import { verifyRun } from './verify.js';
import { ghostRelay } from './websocket.js';
import { RunSubmissionPayload, RunVerifyResponse, LeaderboardRecord } from '../shared/sim/types.js';

const fastify = Fastify({
  logger: true,
});

await fastify.register(cors, {
  origin: '*',
});

await fastify.register(fastifyWebsocket);

// Health check
fastify.get('/api/health', async () => {
  return { status: 'healthy', timestamp: new Date().toISOString() };
});

// Daily Seed Director endpoint
fastify.get('/api/runs/daily', async () => {
  const daily = SeedDirector.getDailySeed();
  return daily;
});

// Custom Seed endpoint
fastify.get<{ Params: { seed: string } }>('/api/runs/seed/:seed', async (req) => {
  return SeedDirector.getCustomSeed(req.params.seed);
});

// Replay-verified run submission: the server re-runs the input log and stores its own result
fastify.post<{ Body: RunSubmissionPayload }>('/api/runs/verify', async (req, reply): Promise<RunVerifyResponse | void> => {
  const payload = req.body;
  const outcome = verifyRun(payload);
  if (!outcome.ok) {
    return reply.status(422).send({ verified: false, reason: outcome.reason } satisfies RunVerifyResponse);
  }
  const { result } = outcome;
  const runId = `run_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const playerName = (payload.playerName || 'RUNNER').trim().substring(0, 16);
  const reason = result.finished ? 'Replayed on the server: reached the evacuation center' : 'Replayed on the server: rescued before the finish';

  try {
    db.prepare(`
      INSERT INTO runs (id, player_name, seed, distance, score, coins, near_misses, max_combo, duration_ms, verified, validation_reason)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
    `).run(runId, playerName, result.seed, result.distance, result.score, result.supplies, result.nearMisses, result.maxCombo, Math.round((result.ticks * 1000) / 60), reason);

    if (Array.isArray(payload.inputTelemetry) && payload.inputTelemetry.length > 0) {
      db.prepare('INSERT INTO telemetry_logs (run_id, telemetry_json) VALUES (?, ?)').run(runId, JSON.stringify(payload.inputTelemetry));
    }

    const rankResult = db.prepare('SELECT count(*) as rank FROM runs WHERE seed = ? AND score >= ? AND verified = 1').get(result.seed, result.score) as { rank: number };

    return { runId, verified: true, reason, result, rank: rankResult.rank || 1 };
  } catch (err: unknown) {
    fastify.log.error(err);
    return reply.status(500).send({ verified: false, reason: 'Could not save the run' } satisfies RunVerifyResponse);
  }
});

// Leaderboard Endpoint
fastify.get<{ Querystring: { seed?: string; limit?: string } }>('/api/leaderboard', async (req) => {
  const seed = req.query.seed;
  const limit = Math.min(50, Math.max(5, parseInt(req.query.limit || '15', 10)));

  let query = `
    SELECT r.id, r.player_name, r.seed, r.distance, r.score, r.coins, r.near_misses, r.max_combo, r.verified, r.validation_reason, r.created_at,
           CASE WHEN t.run_id IS NOT NULL THEN 1 ELSE 0 END as has_ghost
    FROM runs r
    LEFT JOIN telemetry_logs t ON r.id = t.run_id
    WHERE r.verified = 1
  `;
  const params: unknown[] = [];

  if (seed) {
    query += ` AND r.seed = ?`;
    params.push(seed);
  }

  query += ` ORDER BY r.score DESC, r.distance DESC LIMIT ?`;
  params.push(limit);

  const records = db.prepare(query).all(...params) as Array<{
    id: string;
    player_name: string;
    seed: string;
    distance: number;
    score: number;
    coins: number;
    near_misses: number;
    max_combo: number;
    verified: number;
    validation_reason: string;
    created_at: string;
    has_ghost: number;
  }>;

  const formatted: LeaderboardRecord[] = records.map((r) => ({
    id: r.id,
    playerName: r.player_name,
    seed: r.seed,
    distance: r.distance,
    score: r.score,
    coins: r.coins,
    nearMisses: r.near_misses,
    maxCombo: r.max_combo,
    verified: r.verified === 1,
    validationReason: r.validation_reason,
    createdAt: r.created_at,
    hasGhost: r.has_ghost === 1,
  }));

  return { records: formatted };
});

// Ghost Telemetry Retrieval Endpoint
fastify.get<{ Params: { seed: string } }>('/api/ghosts/:seed', async (req, reply) => {
  const seed = req.params.seed;

  // Retrieve top verified run for this seed that has ghost telemetry
  const topRun = db.prepare(`
    SELECT r.id, r.player_name, r.distance, t.telemetry_json
    FROM runs r
    JOIN telemetry_logs t ON r.id = t.run_id
    WHERE r.seed = ? AND r.verified = 1
    ORDER BY r.score DESC
    LIMIT 1
  `).get(seed) as { id: string; player_name: string; distance: number; telemetry_json: string } | undefined;

  if (!topRun) {
    // Fallback to global top ghost run if seed-specific ghost not found
    const globalTop = db.prepare(`
      SELECT r.id, r.player_name, r.distance, t.telemetry_json
      FROM runs r
      JOIN telemetry_logs t ON r.id = t.run_id
      WHERE r.verified = 1
      ORDER BY r.score DESC
      LIMIT 1
    `).get() as { id: string; player_name: string; distance: number; telemetry_json: string } | undefined;

    if (!globalTop) {
      return reply.status(404).send({ error: 'No ghost playback available' });
    }

    return {
      runId: globalTop.id,
      playerName: globalTop.player_name,
      distance: globalTop.distance,
      telemetry: JSON.parse(globalTop.telemetry_json),
    };
  }

  return {
    runId: topRun.id,
    playerName: topRun.player_name,
    distance: topRun.distance,
    telemetry: JSON.parse(topRun.telemetry_json),
  };
});

// WebSocket Ghost Relay Handler
fastify.get('/ws', { websocket: true }, (connection) => {
  const ws = (connection as any).socket || connection;
  if (ws) {
    ws.on('error', (err: any) => {
      if (['ECONNABORTED', 'ECONNRESET', 'EPIPE'].includes(err?.code)) {
        return;
      }
      fastify.log.warn({ err }, 'WebSocket client connection warning');
    });
    ghostRelay.handleConnection(ws);
  }
});

const DEFAULT_PORT = 3002;
const PORT = Number(process.env.BACKEND_PORT || process.env.PORT) || DEFAULT_PORT;

const startServer = async () => {
  const tryListen = async (portToTry: number): Promise<number> => {
    try {
      await fastify.listen({ port: portToTry, host: '0.0.0.0' });
      return portToTry;
    } catch (err: any) {
      if (err.code === 'EADDRINUSE' && portToTry < PORT + 10) {
        console.warn(`⚠️ Port ${portToTry} is in use, retrying on port ${portToTry + 1}...`);
        return await tryListen(portToTry + 1);
      }
      throw err;
    }
  };

  try {
    const activePort = await tryListen(PORT);
    console.log(`🚀 Endless Runner Game Backend Server running on http://localhost:${activePort}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

const handleShutdown = async () => {
  try {
    await fastify.close();
    db.close();
    process.exit(0);
  } catch {
    process.exit(1);
  }
};

process.on('SIGINT', handleShutdown);
process.on('SIGTERM', handleShutdown);

process.on('uncaughtException', (err: any) => {
  if (['ECONNABORTED', 'ECONNRESET', 'EPIPE'].includes(err?.code)) {
    return;
  }
  console.error('Server Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('Server Unhandled Rejection:', reason);
});

startServer();
