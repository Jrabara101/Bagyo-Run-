import { describe, expect, it } from 'vitest';
import { GameSimulation } from '../shared/sim/simulation';
import { JUMP_AIR_SEC, HIT_INVULNERABLE_MS, STARTING_HEARTS } from '../shared/sim/constants';
import { HAZARDS, HazardId } from '../shared/content/hazards';
import { GO_BAG_ITEMS } from '../shared/content/items';
import { COURSE_LENGTH_M } from '../shared/content/areas';
import { finishBonus, SCORE } from '../shared/sim/scoring';
import type { Action, CollectibleEntity, LaneIndex, ObstacleEntity, SimEvent } from '../shared/sim/types';
import { playAutopilot } from './autopilot';

function hazard(hazardId: HazardId, z: number, lane: LaneIndex = 1): ObstacleEntity {
  const h = HAZARDS[hazardId];
  return { id: `t_${hazardId}_${z}`, hazardId, type: h.collision, lane, zPos: z, height: h.height, width: 1, cleared: false };
}

/** A sim whose first 120 m hold only what the test puts there. */
function simWith(obstacles: ObstacleEntity[], collectibles: CollectibleEntity[] = []) {
  const sim = new GameSimulation('RULES');
  sim.chunks = [{ id: 'test', zStart: 0, length: 120, areaId: 'barangay', obstacles, collectibles }];
  return sim;
}

/** Runs until `untilZ`, calling `act` each tick for that tick's inputs. Returns all events. */
function run(sim: GameSimulation, untilZ: number, act: (sim: GameSimulation) => Action[] = () => []) {
  const events: SimEvent[] = [];
  while (sim.status === 'RUNNING' && sim.playerZ < untilZ) events.push(...sim.step(act(sim)));
  return events;
}

/** Jump so the apex lands on a hazard at z. */
const jumpFor = (z: number) => (sim: GameSimulation) =>
  sim.player.isGrounded && z - sim.playerZ > 0 && z - sim.playerZ <= sim.effectiveSpeed * (JUMP_AIR_SEC / 2) + 0.5 ? (['JUMP'] as Action[]) : [];

const hits = (events: SimEvent[]) => events.filter((e) => e.type === 'HAZARD_HIT');

describe('dodging', () => {
  it.each(['debris_pile', 'fallen_branch', 'open_manhole', 'flood_hole'] as HazardId[])('a well-timed jump clears %s', (id) => {
    expect(hits(run(simWith([hazard(id, 40)]), 60, jumpFor(40)))).toHaveLength(0);
  });

  it.each(['debris_pile', 'open_manhole', 'torn_tarp', 'swept_jeepney'] as HazardId[])('running straight into %s costs a heart', (id) => {
    const sim = simWith([hazard(id, 40)]);
    expect(hits(run(sim, 60))).toEqual([{ type: 'HAZARD_HIT', hazardId: id, heartsLeft: STARTING_HEARTS - 1 }]);
    expect(sim.hearts).toBe(STARTING_HEARTS - 1);
  });

  it('sliding gets under a power line or tarpaulin', () => {
    for (const id of ['power_line', 'torn_tarp'] as HazardId[]) {
      const slide = (s: GameSimulation) => (!s.player.isSliding && 40 - s.playerZ < 4 ? (['SLIDE'] as Action[]) : []);
      expect(hits(run(simWith([hazard(id, 40)]), 60, slide))).toHaveLength(0);
    }
  });

  it('a swept-away jeepney cannot be jumped, only avoided by changing lanes', () => {
    expect(hits(run(simWith([hazard('swept_jeepney', 40)]), 60, jumpFor(40)))).toHaveLength(1);
    let moved = false;
    const dodge = (s: GameSimulation): Action[] => (!moved && 40 - s.playerZ < 12 ? ((moved = true), ['LEFT']) : []);
    expect(hits(run(simWith([hazard('swept_jeepney', 40)]), 60, dodge))).toHaveLength(0);
  });
});

describe('hearts', () => {
  it('a hit gives a short invulnerability window', () => {
    const sim = simWith([hazard('debris_pile', 40), hazard('debris_pile', 45)]);
    const gap = 5 / sim.currentSpeed; // seconds between the two
    expect(gap * 1000).toBeLessThan(HIT_INVULNERABLE_MS);
    expect(hits(run(sim, 60))).toHaveLength(1);
  });

  it('a hit resets the near-miss combo', () => {
    const sim = simWith([hazard('debris_pile', 40)]);
    sim.combo = 3;
    run(sim, 60);
    expect(sim.combo).toBe(1);
  });

  it('losing the last heart ends the run as a rescue, keeping the score but no finish bonus', () => {
    const sim = simWith([hazard('debris_pile', 20), hazard('torn_tarp', 50), hazard('open_manhole', 80)]);
    const events = run(sim, 119);
    expect(sim.status).toBe('RESCUED');
    expect(events.at(-1)).toEqual({ type: 'RESCUED', hazardId: 'open_manhole' });
    const result = sim.result();
    expect(result).toMatchObject({ finished: false, heartsLeft: 0, hits: 3, rescuedBy: 'open_manhole' });
    expect(result.score).toBeGreaterThan(0);
    expect(result.score).toBeLessThan(finishBonus(0));
  });

  it('a life vest absorbs one hit without losing a heart', () => {
    const sim = simWith([hazard('debris_pile', 40)]);
    sim.powerUps.push({ type: 'life_vest', expiresAtTick: 10000 });
    const events = run(sim, 60);
    expect(events).toContainEqual({ type: 'SHIELD_ABSORBED', hazardId: 'debris_pile' });
    expect(sim.hearts).toBe(STARTING_HEARTS);
    expect(sim.powerUps).toEqual([]);
  });

  it('Bayanihan makes the player invincible', () => {
    const sim = simWith([hazard('debris_pile', 40)]);
    sim.bayanihanGauge = 100;
    run(sim, 10, () => (sim.isBayanihanActive ? [] : ['BAYANIHAN']));
    expect(hits(run(sim, 60))).toHaveLength(0);
  });
});

describe('Go-Bag', () => {
  it('collecting all 8 items pays each item plus the completion bonus, once', () => {
    const items: CollectibleEntity[] = GO_BAG_ITEMS.map((item, i) => ({
      id: `g${i}`, type: 'gobag', itemId: item.id, lane: 1, zPos: 20 + i * 10, yOffset: 12, collected: false,
    }));
    const sim = simWith([], items);
    const events = run(sim, 110);
    expect(sim.goBag).toEqual(GO_BAG_ITEMS.map((i) => i.id));
    expect(events.filter((e) => e.type === 'GO_BAG_COMPLETE')).toHaveLength(1);
    const distanceOnly = simWith([]);
    run(distanceOnly, 110);
    expect(sim.score - distanceOnly.score).toBe(8 * SCORE.goBagItem + SCORE.goBagComplete);
  });
});

describe('a full match', () => {
  const SEEDS = ['MATCH-1', 'MATCH-2', 'MATCH-3', 'SEED-DAILY-GAUNTLET', 'GAUNTLET-2026-10-14'];

  it.each(SEEDS)('runs %s from the barangay to the evacuation center in 2 to 3 minutes', (seed) => {
    const { sim, events } = playAutopilot(seed);
    const result = sim.result();
    expect(result.finished).toBe(true);
    expect(result.distance).toBe(COURSE_LENGTH_M);
    expect(result.heartsLeft).toBeGreaterThan(0);
    expect(result.ticks / 60).toBeGreaterThan(100);
    expect(result.ticks / 60).toBeLessThan(180);
    expect(events.at(-1)).toEqual({ type: 'FINISHED' });
    expect(events.filter((e) => e.type === 'SIGNAL_UP').map((e) => (e as { level: number }).level)).toEqual([2, 3, 4, 5]);
    expect(events.filter((e) => e.type === 'AREA_ENTERED').map((e) => (e as { areaId: string }).areaId)).toEqual(['estero', 'palayan', 'evac']);
  });

  it('adds the finish bonus and 1,000 per heart left exactly once, at the line', () => {
    const { sim, events } = playAutopilot('MATCH-1');
    const finishTick = events.findIndex((e) => e.type === 'FINISHED');
    expect(finishTick).toBeGreaterThan(-1);
    expect(finishBonus(sim.hearts)).toBe(SCORE.finish + sim.hearts * SCORE.perHeart);
    expect(sim.score).toBeGreaterThan(finishBonus(sim.hearts));
  });
});
