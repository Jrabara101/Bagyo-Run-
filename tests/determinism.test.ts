import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { GameSimulation } from '../shared/sim/simulation';
import { replay } from '../shared/sim/replay';
import { Mulberry32 } from '../shared/sim/rng';
import type { Action, InputEvent, SimEvent } from '../shared/sim/types';

const ACTIONS: Action[] = ['LEFT', 'RIGHT', 'JUMP', 'SLIDE', 'BAYANIHAN'];

/** A long run: dodges what is in its lane and fires overdrive whenever the gauge allows. */
function playAutopilot(seed: string, maxTicks: number) {
  const sim = new GameSimulation(seed);
  const inputLog: InputEvent[] = [];
  const events: SimEvent[] = [];
  let cooldown = 0;

  while (sim.status === 'RUNNING' && sim.tick < maxTicks) {
    const actions: Action[] = [];
    if (cooldown-- <= 0) {
      const lane = sim.player.lane;
      const ahead = sim.chunks
        .flatMap((c) => c.obstacles)
        .filter((o) => !o.cleared && o.zPos > sim.playerZ && o.zPos - sim.playerZ < 9);
      const blocking = ahead.find((o) => o.lane === lane);
      if (sim.overdriveGauge >= 40 && !sim.isOverdriveActive) {
        actions.push('BAYANIHAN');
      } else if (blocking) {
        const free = [lane - 1, lane + 1].filter((l) => l >= 0 && l <= 2 && !ahead.some((o) => o.lane === l));
        if (free.length && blocking.type !== 'barrier_high') actions.push(free[0] < lane ? 'LEFT' : 'RIGHT');
        else actions.push(blocking.type === 'barrier_high' ? 'SLIDE' : 'JUMP');
        cooldown = 6;
      }
    }
    for (const action of actions) inputLog.push({ tick: sim.tick, action });
    events.push(...sim.step(actions));
  }
  return { sim, inputLog, events };
}

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
    const a = playAutopilot('DET-1', 6000);
    const b = playAutopilot('DET-1', 6000);
    expect(a.sim.tick).toBeGreaterThan(1000); // the run is long enough to mean something
    expect(b.sim.result()).toEqual(a.sim.result());
    expect(b.events).toEqual(a.events);
    expect(b.sim.player).toEqual(a.sim.player);
    expect(b.sim.chunks).toEqual(a.sim.chunks);
  });

  it('replay(seed, inputLog) reproduces a live run exactly', () => {
    for (const seed of ['DET-2', 'DET-3', 'DET-4', 'SEED-DAILY-GAUNTLET']) {
      const live = playAutopilot(seed, 20000);
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
    const live = playAutopilot('DET-5', 20000);
    const dropped = live.inputLog.filter((_, i) => i !== Math.floor(live.inputLog.length / 2));
    expect(replay('DET-5', dropped, live.sim.tick)).not.toEqual(live.sim.result());
  });

  it('stops stepping once crashed', () => {
    const sim = new GameSimulation('CRASH');
    while (sim.status === 'RUNNING' && sim.tick < 100000) sim.step();
    expect(sim.status).toBe('CRASHED');
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
