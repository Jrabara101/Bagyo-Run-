import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { GameSimulation } from '../shared/sim/simulation';
import { replay } from '../shared/sim/replay';
import { Mulberry32 } from '../shared/sim/rng';
import type { Action, InputEvent } from '../shared/sim/types';
import { playAutopilot } from './autopilot';

const ACTIONS: Action[] = ['LEFT', 'RIGHT', 'JUMP', 'SLIDE', 'BAYANIHAN'];

function randomLog(logSeed: string, length: number): InputEvent[] {
  const rng = new Mulberry32(logSeed);
  const log: InputEvent[] = [];
  let tick = 0;
  while (tick < length) {
    tick += rng.nextInt(0, 30); // 0 = several inputs on the same tick
    log.push({ tick, action: rng.pick(ACTIONS) });
  }
  return log;
}

describe('GameSimulation determinism', () => {
  it('gives the same result, state and events for the same seed and inputs', () => {
    const a = playAutopilot('DET-1');
    const b = playAutopilot('DET-1');
    expect(a.sim.tick).toBeGreaterThan(3000); // a long run, so the comparison means something
    expect(b.sim.result()).toEqual(a.sim.result());
    expect(b.events).toEqual(a.events);
    expect(b.sim.player).toEqual(a.sim.player);
    expect(b.sim.chunks).toEqual(a.sim.chunks);
  });

  it('replay(seed, inputLog) reproduces a live run exactly', () => {
    for (const seed of ['DET-2', 'DET-3', 'DET-4', 'SEED-DAILY-GAUNTLET']) {
      const live = playAutopilot(seed);
      expect(replay(seed, live.inputLog, live.sim.tick)).toEqual(live.sim.result());
    }
  });

  it('replays random input logs identically, including same-tick inputs', () => {
    for (let i = 0; i < 50; i++) {
      const log = randomLog(`log-${i}`, 5000);
      expect(replay(`R-${i}`, log, 5000)).toEqual(replay(`R-${i}`, log, 5000));
    }
  });

  it('is sensitive to inputs: a different log gives a different run', () => {
    const live = playAutopilot('DET-5');
    // Some single inputs are redundant (a jump requested mid-air), so drop a stretch of them
    const third = Math.floor(live.inputLog.length / 3);
    const dropped = live.inputLog.filter((_, i) => i < third || i >= third + 10);
    expect(replay('DET-5', dropped, live.sim.tick)).not.toEqual(live.sim.result());
  });

  it('stops stepping once the run has ended', () => {
    const sim = new GameSimulation('END');
    while (sim.status === 'RUNNING' && sim.tick < 100000) sim.step();
    expect(sim.status).not.toBe('RUNNING');
    const before = sim.result();
    expect(sim.step(['JUMP'])).toEqual([]);
    expect(sim.result()).toEqual(before);
  });
});

describe('shared/ purity', () => {
  const FORBIDDEN = /\bMath\.random\b|\bDate\b|\bperformance\b|\bwindow\b|\bdocument\b|\brequestAnimationFrame\b|\bprocess\b|from ['"]node:/;

  function sourceFiles(dir: string): string[] {
    return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
      e.isDirectory() ? sourceFiles(join(dir, e.name)) : e.name.endsWith('.ts') ? [join(dir, e.name)] : []
    );
  }

  it('uses no clock, global randomness, DOM or Node APIs', () => {
    const offenders = sourceFiles(join(__dirname, '..', 'shared')).filter((f) =>
      readFileSync(f, 'utf8')
        .split('\n')
        .some((line) => !line.trim().startsWith('//') && !line.trim().startsWith('*') && FORBIDDEN.test(line))
    );
    expect(offenders).toEqual([]);
  });
});
