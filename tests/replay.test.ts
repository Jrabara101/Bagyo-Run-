import { describe, expect, it } from 'vitest';
import { verifyRun } from '../server/verify';
import type { RunSubmissionPayload } from '../shared/sim/types';
import { playAutopilot } from './autopilot';

function submission(seed: string): { payload: RunSubmissionPayload; score: number } {
  const { sim, inputLog } = playAutopilot(seed);
  return { payload: { seed, playerName: 'TEST', inputLog, ticks: sim.tick, inputTelemetry: [] }, score: sim.score };
}

describe('server replay verification', () => {
  it('computes the same result as the client for a finished run', () => {
    for (const seed of ['VER-1', 'VER-2', 'SEED-DAILY-GAUNTLET']) {
      const { payload, score } = submission(seed);
      const outcome = verifyRun(payload);
      expect(outcome.ok).toBe(true);
      if (outcome.ok) {
        expect(outcome.result.score).toBe(score);
        expect(outcome.result.finished).toBe(true);
      }
    }
  });

  it('rejects a run that claims more ticks than the replay lasts', () => {
    const { payload } = submission('VER-3');
    expect(verifyRun({ ...payload, ticks: payload.ticks + 600 })).toMatchObject({ ok: false });
  });

  it('rejects a run cut short before the finish or a rescue', () => {
    const { payload } = submission('VER-4');
    expect(verifyRun({ ...payload, ticks: Math.floor(payload.ticks / 2) })).toMatchObject({ ok: false });
  });

  it('a tampered input log replays to a different run, never the claimed one', () => {
    const { payload, score } = submission('VER-5');
    const tampered = { ...payload, inputLog: payload.inputLog.slice(0, Math.floor(payload.inputLog.length / 2)) };
    const outcome = verifyRun(tampered);
    if (outcome.ok) expect(outcome.result.score).not.toBe(score);
  });

  it('rejects malformed payloads', () => {
    const { payload } = submission('VER-6');
    expect(verifyRun(undefined)).toMatchObject({ ok: false });
    expect(verifyRun({ ...payload, seed: '' })).toMatchObject({ ok: false });
    expect(verifyRun({ ...payload, ticks: -1 })).toMatchObject({ ok: false });
    expect(verifyRun({ ...payload, inputLog: [{ tick: 5, action: 'FLY' }] as never })).toMatchObject({ ok: false });
    expect(verifyRun({ ...payload, inputLog: [{ tick: 9, action: 'JUMP' }, { tick: 3, action: 'JUMP' }] })).toMatchObject({ ok: false });
  });
});
