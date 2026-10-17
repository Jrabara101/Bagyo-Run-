import { replay } from '../shared/sim/replay.js';
import { RULES_VERSION } from '../shared/sim/constants.js';
import type { Action, InputEvent, RunResult, RunSubmissionPayload, VerifyCode } from '../shared/sim/types.js';

const ACTIONS = new Set<Action>(['LEFT', 'RIGHT', 'JUMP', 'SLIDE', 'BAYANIHAN']);
const MAX_TICKS = 60 * 60 * 10; // 10 minutes; a full course takes about 2
const MAX_INPUTS = 20000;
const SEED = /^[A-Za-z0-9_-]{1,64}$/;

export type VerifyOutcome = { ok: true; result: RunResult } | { ok: false; code: Exclude<VerifyCode, 'saved' | 'save_failed'> };

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
  if (!payload || typeof payload !== 'object') return { ok: false, code: 'bad_request' };
  if (typeof payload.seed !== 'string' || !SEED.test(payload.seed)) return { ok: false, code: 'bad_seed' };
  if (payload.rulesVersion !== RULES_VERSION) return { ok: false, code: 'old_rules' };
  if (!Number.isInteger(payload.ticks) || payload.ticks <= 0 || payload.ticks > MAX_TICKS) return { ok: false, code: 'bad_length' };
  if (!isInputLog(payload.inputLog)) return { ok: false, code: 'bad_inputs' };

  const result = replay(payload.seed, payload.inputLog, payload.ticks);
  if (result.ticks !== payload.ticks) return { ok: false, code: 'tick_mismatch' };
  if (!result.finished && result.heartsLeft > 0) return { ok: false, code: 'not_ended' };
  return { ok: true, result };
}

/** Letters (any script, so ñ works), digits, space, dot, dash and underscore; 16 at most. */
export function cleanPlayerName(name: unknown): string {
  const cleaned = typeof name === 'string' ? name.normalize('NFC').replace(/[^\p{L}\p{N} ._-]/gu, '').replace(/\s+/g, ' ').trim().slice(0, 16) : '';
  return cleaned || 'RUNNER';
}
