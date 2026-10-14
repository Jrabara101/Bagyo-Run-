import { replay } from '../shared/sim/replay.js';
import type { Action, InputEvent, RunResult, RunSubmissionPayload } from '../shared/sim/types.js';

const ACTIONS = new Set<Action>(['LEFT', 'RIGHT', 'JUMP', 'SLIDE', 'BAYANIHAN']);
const MAX_TICKS = 60 * 60 * 10; // 10 minutes; a full course takes about 2
const MAX_INPUTS = 20000;

export type VerifyOutcome = { ok: true; result: RunResult } | { ok: false; reason: string };

function isInputLog(log: unknown): log is InputEvent[] {
  if (!Array.isArray(log) || log.length > MAX_INPUTS) return false;
  let previous = 0;
  for (const e of log) {
    if (!e || typeof e !== 'object') return false;
    const { tick, action } = e as InputEvent;
    if (!Number.isInteger(tick) || tick < previous || !ACTIONS.has(action)) return false;
    previous = tick;
  }
  return true;
}

/**
 * Replays the submitted inputs on the shared simulation. The result is the server's own score;
 * nothing the client claims about score or distance is trusted.
 */
export function verifyRun(payload: RunSubmissionPayload | undefined): VerifyOutcome {
  if (!payload || typeof payload.seed !== 'string' || payload.seed.length === 0 || payload.seed.length > 64) {
    return { ok: false, reason: 'Missing or invalid seed' };
  }
  if (!Number.isInteger(payload.ticks) || payload.ticks <= 0 || payload.ticks > MAX_TICKS) {
    return { ok: false, reason: 'Invalid run length' };
  }
  if (!isInputLog(payload.inputLog)) {
    return { ok: false, reason: 'Malformed input log' };
  }

  const result = replay(payload.seed, payload.inputLog, payload.ticks);
  if (result.ticks !== payload.ticks) {
    return { ok: false, reason: `Replay ended at tick ${result.ticks}, run claims ${payload.ticks}` };
  }
  if (!result.finished && result.heartsLeft > 0) {
    return { ok: false, reason: 'Replay did not reach the finish or a rescue' };
  }
  return { ok: true, result };
}
