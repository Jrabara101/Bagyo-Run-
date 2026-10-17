import { describe, expect, it } from 'vitest';
import { CHUNK_LENGTH, COURSE_LENGTH_M, generateChunk, goBagPlan } from '../shared/sim/course';
import { FINISH_CLEAR_M } from '../shared/sim/constants';
import { AREAS, areaAt } from '../shared/content/areas';
import { SIGNALS, signalAt } from '../shared/content/signals';
import { GO_BAG_ITEMS } from '../shared/content/items';
import { HAZARDS } from '../shared/content/hazards';
import type { TrackChunk } from '../shared/sim/types';

const SEEDS = ['TEST-SEED', 'SEED-A', 'SEED-B', 'SEED-DAILY-GAUNTLET', 'GAUNTLET-2026-10-14', 'x', ''];
const LAST_CHUNK = Math.ceil(COURSE_LENGTH_M / CHUNK_LENGTH);

function wholeCourse(seed: string): TrackChunk[] {
  return Array.from({ length: LAST_CHUNK + 1 }, (_, i) => generateChunk(i, seed));
}

describe('course content', () => {
  it('areas tile the course with no gaps or overlaps', () => {
    expect(AREAS[0].startM).toBe(0);
    for (let i = 1; i < AREAS.length; i++) expect(AREAS[i].startM).toBe(AREAS[i - 1].endM);
    expect(AREAS[AREAS.length - 1].endM).toBe(COURSE_LENGTH_M);
    expect(areaAt(COURSE_LENGTH_M - 1).id).toBe('evac');
  });

  it('signals rise 1 to 5 along the course and get faster', () => {
    expect(SIGNALS.map((s) => s.level)).toEqual([1, 2, 3, 4, 5]);
    for (let i = 1; i < SIGNALS.length; i++) {
      expect(SIGNALS[i].startM).toBeGreaterThan(SIGNALS[i - 1].startM);
      expect(SIGNALS[i].speed).toBeGreaterThan(SIGNALS[i - 1].speed);
    }
    expect(signalAt(COURSE_LENGTH_M - 1).level).toBe(5);
  });

  it('a full run takes 2 to 3 minutes at signal pace', () => {
    let seconds = 0;
    for (let i = 0; i < SIGNALS.length; i++) {
      const end = i + 1 < SIGNALS.length ? SIGNALS[i + 1].startM : COURSE_LENGTH_M;
      seconds += (end - SIGNALS[i].startM) / SIGNALS[i].speed;
    }
    expect(seconds).toBeGreaterThanOrEqual(105);
    expect(seconds).toBeLessThanOrEqual(180);
  });
});

describe('course generation', () => {
  it('produces the same chunk for the same seed and index', () => {
    for (let i = 0; i <= LAST_CHUNK; i++) {
      expect(generateChunk(i, 'TEST-SEED')).toEqual(generateChunk(i, 'TEST-SEED'));
    }
  });

  it('produces different layouts for different seeds', () => {
    const a = JSON.stringify(generateChunk(5, 'SEED-A').obstacles);
    const b = JSON.stringify(generateChunk(5, 'SEED-B').obstacles);
    expect(a).not.toEqual(b);
  });

  it('keeps the start and the run-in to the finish free of hazards, and nothing past the finish', () => {
    for (const seed of SEEDS) {
      expect(generateChunk(0, seed).obstacles).toHaveLength(0);
      const late = wholeCourse(seed).flatMap((c) => c.obstacles).filter((o) => o.zPos > COURSE_LENGTH_M - FINISH_CLEAR_M);
      expect(late).toEqual([]);
      expect(generateChunk(LAST_CHUNK + 1, seed).collectibles).toEqual([]);
    }
  });

  it('only places hazards that belong to the area they are in', () => {
    for (const seed of SEEDS) {
      for (const o of wholeCourse(seed).flatMap((c) => c.obstacles)) {
        expect(Object.keys(areaAt(o.zPos).hazards)).toContain(o.hazardId);
        expect(o.type).toBe(HAZARDS[o.hazardId].collision);
      }
    }
  });

  it('never blocks all three lanes at once, and never puts lane blockers before Signal 2', () => {
    for (const seed of SEEDS) {
      const obstacles = wholeCourse(seed).flatMap((c) => c.obstacles);
      for (const o of obstacles) {
        const near = obstacles.filter((p) => Math.abs(p.zPos - o.zPos) < 6);
        expect(new Set(near.map((p) => p.lane)).size).toBeLessThan(3);
        if (o.type === 'moving_train') expect(signalAt(o.zPos).laneHazards).toBe(true);
      }
    }
  });
});

describe('Go-Bag placement', () => {
  it('places each of the 8 items exactly once, inside the course', () => {
    for (const seed of SEEDS) {
      const items = wholeCourse(seed).flatMap((c) => c.collectibles).filter((c) => c.type === 'gobag');
      expect(items.map((i) => i.itemId).sort()).toEqual(GO_BAG_ITEMS.map((i) => i.id).sort());
      for (const item of items) {
        expect(item.zPos).toBeGreaterThan(100);
        expect(item.zPos).toBeLessThan(COURSE_LENGTH_M - FINISH_CLEAR_M);
      }
    }
  });

  it('keeps Go-Bag items out of lanes with a hazard right next to them', () => {
    for (const seed of SEEDS) {
      const chunks = wholeCourse(seed);
      const obstacles = chunks.flatMap((c) => c.obstacles);
      for (const item of chunks.flatMap((c) => c.collectibles).filter((c) => c.type === 'gobag')) {
        const clash = obstacles.filter((o) => o.lane === item.lane && Math.abs(o.zPos - item.zPos) < 8);
        expect(clash).toEqual([]);
      }
    }
  });

  it('is seeded: same seed, same plan; different seeds differ', () => {
    expect(goBagPlan('A')).toEqual(goBagPlan('A'));
    expect(goBagPlan('A')).not.toEqual(goBagPlan('B'));
  });
});
