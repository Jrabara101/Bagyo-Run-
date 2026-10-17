import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import type { Db } from './db.js';
import { cleanPlayerName, verifyRun } from './verify.js';
import { leaderboard, rankOf, runInputs, saveRun, topRun } from './store.js';
import { dailyChallenge, manilaDateKey } from '../shared/sim/daily.js';
import { ghostPath } from '../shared/sim/replay.js';
import type { DailyChallenge, GhostTrack, RunSubmissionPayload, RunVerifyResponse } from '../shared/sim/types.js';

/** Seeds that never reach the leaderboard (the coached practice course). */
const UNRANKED_SEEDS = new Set(['PRACTICE']);

/**
 * The HTTP API. Separate from index.ts so tests can drive it with `inject` on an in-memory DB.
 * `now` is injectable for the same reason (the daily challenge depends on the date in Manila).
 */
export async function buildApp(db: Db, opts: { logger?: boolean; now?: () => number } = {}): Promise<FastifyInstance> {
  const app = Fastify({ logger: opts.logger ?? false, bodyLimit: 1024 * 1024 });
  const now = opts.now ?? (() => Date.now());
  await app.register(cors, { origin: '*' });

  app.get('/api/health', async () => ({ status: 'healthy' }));

  app.get('/api/daily', async (): Promise<DailyChallenge> => {
    const daily = dailyChallenge(manilaDateKey(now()));
    return { ...daily, topRun: topRun(db, daily.seed) };
  });

  // Replay-verified submission: the server re-runs the input log and stores its own result
  app.post<{ Body: RunSubmissionPayload }>('/api/runs', async (req, reply): Promise<RunVerifyResponse> => {
    const payload = req.body;
    if (payload && UNRANKED_SEEDS.has(payload.seed)) return reply.status(422).send({ verified: false, code: 'bad_seed' });
    const outcome = verifyRun(payload);
    if (!outcome.ok) return reply.status(422).send({ verified: false, code: outcome.code });

    const playerName = cleanPlayerName(payload.playerName);
    try {
      const runId = saveRun(db, playerName, outcome.result, payload.inputLog);
      const rank = rankOf(db, outcome.result.seed, playerName, outcome.result.score);
      return { verified: true, code: 'saved', runId, result: outcome.result, rank };
    } catch (err) {
      req.log.error(err);
      // The replay itself succeeded, so the client may still show the verified result
      return reply.status(500).send({ verified: true, code: 'save_failed', result: outcome.result });
    }
  });

  app.get<{ Querystring: { seed?: string; limit?: string } }>('/api/leaderboard', async (req) => {
    const limit = Math.min(50, Math.max(5, parseInt(req.query.limit || '20', 10) || 20));
    return { records: leaderboard(db, req.query.seed || undefined, limit) };
  });

  // A ghost is the stored run replayed again here, so its path is as trustworthy as its score
  app.get<{ Params: { id: string } }>('/api/runs/:id/ghost', async (req, reply): Promise<GhostTrack> => {
    const run = runInputs(db, req.params.id);
    if (!run) return reply.status(404).send({ error: 'not_found' });
    return { runId: req.params.id, playerName: run.playerName, seed: run.seed, points: ghostPath(run.seed, run.inputLog, run.ticks) };
  });

  return app;
}
