import { describe, expect, it } from 'vitest';
import { cleanPlayerName, verifyRun } from '../server/verify';
import { RULES_VERSION } from '../shared/sim/constants';
import { ghostPath } from '../shared/sim/replay';
import { submission } from './autopilot';

describe('server replay verification', () => {
  it('computes the same result as the client for a finished run', () => {
    for (const seed of ['VER-1', 'VER-2', 'BAGYO-2026-10-20']) {
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
    expect(verifyRun({ ...payload, ticks: payload.ticks + 600 })).toEqual({ ok: false, code: 'tick_mismatch' });
  });

  it('rejects a run cut short before the finish or a rescue', () => {
    const { payload } = submission('VER-4');
    expect(verifyRun({ ...payload, ticks: Math.floor(payload.ticks / 2) })).toEqual({ ok: false, code: 'not_ended' });
  });

  it('a tampered input log replays to a different run, never the claimed one', () => {
    const { payload, score } = submission('VER-5');
    const tampered = { ...payload, inputLog: payload.inputLog.slice(0, Math.floor(payload.inputLog.length / 2)) };
    const outcome = verifyRun(tampered);
    if (outcome.ok) expect(outcome.result.score).not.toBe(score);
  });

  it('rejects malformed payloads with a code the client can translate', () => {
    const { payload } = submission('VER-6');
    expect(verifyRun(undefined)).toEqual({ ok: false, code: 'bad_request' });
    expect(verifyRun({ ...payload, seed: '' })).toEqual({ ok: false, code: 'bad_seed' });
    expect(verifyRun({ ...payload, seed: 'has spaces/and slashes' })).toEqual({ ok: false, code: 'bad_seed' });
    expect(verifyRun({ ...payload, rulesVersion: RULES_VERSION - 1 })).toEqual({ ok: false, code: 'old_rules' });
    expect(verifyRun({ ...payload, ticks: -1 })).toEqual({ ok: false, code: 'bad_length' });
    expect(verifyRun({ ...payload, inputLog: [{ tick: 5, action: 'FLY' }] as never })).toEqual({ ok: false, code: 'bad_inputs' });
    expect(verifyRun({ ...payload, inputLog: [{ tick: 9, action: 'JUMP' }, { tick: 3, action: 'JUMP' }] })).toEqual({ ok: false, code: 'bad_inputs' });
  });
});

describe('ghost path', () => {
  it('follows the replayed run in time order and ends where the run ended', () => {
    const { payload } = submission('GHOST-1');
    const points = ghostPath(payload.seed, payload.inputLog, payload.ticks);
    expect(points.length).toBeGreaterThan(100);
    for (let i = 1; i < points.length; i++) {
      expect(points[i].timeMs).toBeGreaterThan(points[i - 1].timeMs);
      expect(points[i].z).toBeGreaterThanOrEqual(points[i - 1].z);
    }
    expect(points.at(-1)!.z).toBeGreaterThanOrEqual(2500);
  });
});

describe('player names', () => {
  it('keeps letters in any script, digits and a few separators, up to 16', () => {
    expect(cleanPlayerName('Juan dela Cruz')).toBe('Juan dela Cruz');
    expect(cleanPlayerName('Niño')).toBe('Niño');
    expect(cleanPlayerName('<script>x</script>')).toBe('scriptxscript');
    expect(cleanPlayerName('a'.repeat(30))).toHaveLength(16);
    expect(cleanPlayerName('   ')).toBe('RUNNER');
    expect(cleanPlayerName(42)).toBe('RUNNER');
  });
});
