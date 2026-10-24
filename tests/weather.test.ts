import { describe, expect, it } from 'vitest';
import { GameSimulation } from '../shared/sim/simulation';
import { CHUNK_LENGTH, COURSE_LENGTH_M, generateChunk } from '../shared/sim/course';
import { gatePlan } from '../shared/sim/quiz';
import { FLOOD_SLOW, GUST_CLEAR_AFTER_M, GUST_CLEAR_BEFORE_M, weatherPlan } from '../shared/sim/weather';
import { SCORE } from '../shared/sim/scoring';
import { AREA_WEATHER } from '../shared/content/weather';
import { AREAS } from '../shared/content/areas';
import { HAZARDS } from '../shared/content/hazards';
import type { Action, ObstacleEntity, SimEvent } from '../shared/sim/types';
import { playAutopilot } from './autopilot';

const SEEDS = ['W-1', 'W-2', 'W-3', 'BAGYO-2026-10-25', 'PRACTICE'];

/** Runs until `untilZ` with every hazard taken off the course, so only the weather acts. */
function run(sim: GameSimulation, untilZ: number, act: (sim: GameSimulation) => Action[] = () => []) {
  const events: SimEvent[] = [];
  while (sim.status === 'RUNNING' && sim.playerZ < untilZ) {
    for (const chunk of sim.chunks) chunk.obstacles = [];
    events.push(...sim.step(act(sim)));
  }
  return events;
}

/** A sim placed just before `z`, with the gates and earlier gusts already behind it. */
function emptySimAt(seed: string, z: number) {
  const sim = new GameSimulation(seed);
  sim.chunks = [];
  sim.playerZ = z;
  sim.nextGate = sim.gates.length;
  sim.nextGust = sim.weather.gusts.findIndex((g) => g.z > z);
  if (sim.nextGust < 0) sim.nextGust = sim.weather.gusts.length;
  return sim;
}

describe('weather plan', () => {
  it('is the same for the same seed and differs between seeds', () => {
    expect(weatherPlan('W-1')).toEqual(weatherPlan('W-1'));
    expect(weatherPlan('W-1')).not.toEqual(weatherPlan('W-2'));
  });

  it('places every gust and most floods the areas ask for, clear of the quiz gates', () => {
    for (const seed of SEEDS) {
      const plan = weatherPlan(seed);
      const gates = gatePlan(seed);
      const wantGusts = AREAS.reduce((n, a) => n + AREA_WEATHER[a.id].gusts, 0);
      const wantFloods = AREAS.reduce((n, a) => n + AREA_WEATHER[a.id].floods.length, 0);
      expect(plan.gusts.length).toBeGreaterThanOrEqual(wantGusts - 2);
      expect(plan.gusts.length).toBeLessThanOrEqual(wantGusts);
      expect(plan.floods.length).toBeGreaterThanOrEqual(wantFloods - 1);
      expect(plan.floods.length).toBeLessThanOrEqual(wantFloods);
      for (const g of gates) {
        for (const gust of plan.gusts) expect(gust.z < g.showZ - 20 || gust.z > g.z + 40).toBe(true);
        for (const f of plan.floods) expect(f.endZ < g.z - 25 || f.startZ > g.z + 35).toBe(true);
      }
      for (const gust of plan.gusts) expect(gust.dir).toBe(plan.windDir[AREAS.find((a) => gust.z >= a.startM && gust.z < a.endM)!.id]);
    }
  });

  it('keeps hazards off a gust shove and off the high ground of a flood', () => {
    for (const seed of SEEDS) {
      const plan = weatherPlan(seed);
      const obstacles: ObstacleEntity[] = [];
      for (let i = 0; i * CHUNK_LENGTH < COURSE_LENGTH_M; i++) obstacles.push(...generateChunk(i, seed).obstacles);
      for (const o of obstacles) {
        for (const g of plan.gusts) expect(o.zPos >= g.z - GUST_CLEAR_BEFORE_M && o.zPos <= g.z + GUST_CLEAR_AFTER_M).toBe(false);
        for (const f of plan.floods) if (o.zPos >= f.startZ && o.zPos < f.endZ) expect(o.lane).not.toBe(f.safeLane);
      }
    }
  });

  it('only sends lightning where lane hazards are allowed, and it is dodged by lane', () => {
    expect(HAZARDS.lightning_strike).toMatchObject({ avoid: 'lane', collision: 'moving_train' });
  });
});

describe('wind gusts', () => {
  const seed = 'W-1';
  const gust = weatherPlan(seed).gusts[0];

  it('warns ahead, then shoves a runner who is standing one lane downwind and resets the combo', () => {
    const sim = emptySimAt(seed, gust.z - 60);
    sim.combo = 2;
    const events = run(sim, gust.z + 1);
    expect(events).toContainEqual({ type: 'GUST_WARNING', dir: gust.dir });
    expect(events).toContainEqual({ type: 'GUST', dir: gust.dir, braced: false, pushed: true, points: 0 });
    expect(sim.player.lane).toBe(1 + gust.dir);
    expect(sim.combo).toBe(1);
  });

  it('a runner crouching (sliding) as it hits holds the lane and earns the brace bonus', () => {
    const sim = emptySimAt(seed, gust.z - 60);
    const before = { score: 0 };
    const events = run(sim, gust.z + 1, (s) => {
      before.score = s.score;
      return !s.player.isSliding && gust.z - s.playerZ < 5 ? ['SLIDE'] : [];
    });
    expect(events).toContainEqual({ type: 'GUST', dir: gust.dir, braced: true, pushed: false, points: SCORE.gustBraced });
    expect(sim.player.lane).toBe(1);
    expect(sim.gustsBraced).toBe(1);
  });
});

describe('floods', () => {
  const seed = 'W-2';
  const flood = weatherPlan(seed).floods[0];
  const deepLane = flood.safeLane === 1 ? 0 : 1;

  it('deep water slows the run and stops jumping; the high ground does not', () => {
    const deep = emptySimAt(seed, flood.startZ - 5);
    deep.kinematics.player.lane = deepLane;
    deep.kinematics.player.targetX = deep.kinematics.player.currentX = deepLane - 1;
    const events = run(deep, flood.startZ + 30);
    expect(events).toContainEqual({ type: 'FLOOD_ENTERED', safeLane: flood.safeLane });
    expect(deep.effectiveSpeed).toBeCloseTo(deep.currentSpeed * (1 - FLOOD_SLOW), 5);
    expect(deep.input('JUMP')).toEqual([{ type: 'JUMP_BLOCKED' }]);

    const high = emptySimAt(seed, flood.startZ - 5);
    high.kinematics.player.lane = flood.safeLane;
    high.kinematics.player.targetX = high.kinematics.player.currentX = flood.safeLane - 1;
    run(high, flood.startZ + 30);
    expect(high.effectiveSpeed).toBe(high.currentSpeed);
    expect(high.input('JUMP')).toEqual([{ type: 'JUMP_REQUESTED' }]);
  });

  it('says when the flood is behind the player', () => {
    const sim = emptySimAt(seed, flood.startZ - 5);
    const events = run(sim, flood.endZ + 1);
    expect(events.filter((e) => e.type === 'FLOOD_LEFT')).toHaveLength(1);
    expect(sim.flood).toBeNull();
  });
});

describe('a full run with weather', () => {
  it.each(SEEDS)('the autopilot braces gusts and reaches the evacuation center on %s', (seed) => {
    const { sim } = playAutopilot(seed);
    expect(sim.result().finished).toBe(true);
    expect(sim.gustsBraced).toBe(sim.weather.gusts.length);
  });
});
