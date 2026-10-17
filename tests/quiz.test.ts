import { describe, expect, it } from 'vitest';
import { QUESTIONS, questionById } from '../shared/content/questions';
import { AREAS, areaAt, COURSE_LENGTH_M } from '../shared/content/areas';
import { CHUNK_LENGTH, generateChunk } from '../shared/sim/course';
import { FINISH_CLEAR_M } from '../shared/sim/constants';
import { GATE_CLEAR_AFTER_M, GATE_CLEAR_BEFORE_M, GATE_SHOW_SEC, GATES_PER_AREA, gatePlan, inGateClearZone } from '../shared/sim/quiz';
import { gatePoints } from '../shared/sim/scoring';
import { signalAt } from '../shared/content/signals';
import { GameSimulation } from '../shared/sim/simulation';
import { replay } from '../shared/sim/replay';
import type { SimEvent } from '../shared/sim/types';
import { playAutopilot } from './autopilot';

const SEEDS = ['QUIZ-1', 'QUIZ-2', 'SEED-DAILY-GAUNTLET', 'GAUNTLET-2026-10-14', 'x', ''];
const LAST_CHUNK = Math.ceil(COURSE_LENGTH_M / CHUNK_LENGTH);

describe('question bank', () => {
  it('has 30 to 40 questions with unique ids', () => {
    expect(QUESTIONS.length).toBeGreaterThanOrEqual(30);
    expect(QUESTIONS.length).toBeLessThanOrEqual(40);
    expect(new Set(QUESTIONS.map((q) => q.id)).size).toBe(QUESTIONS.length);
  });

  it('every question is complete in English and Filipino and cites a source', () => {
    for (const q of QUESTIONS) {
      const texts = [q.prompt, q.lesson, ...q.choices];
      for (const t of texts) {
        expect(t.en.trim(), q.id).not.toBe('');
        expect(t.fil.trim(), q.id).not.toBe('');
      }
      expect(q.choices).toHaveLength(3);
      expect(new Set(q.choices.map((c) => c.en)).size, q.id).toBe(3);
      expect([0, 1, 2]).toContain(q.answer);
      expect(q.source.org, q.id).toBeTruthy();
      expect(q.source.ref.trim(), q.id).not.toBe('');
      expect(q.areas.length, q.id).toBeGreaterThan(0);
    }
  });

  it('each area has enough questions that a run never repeats one', () => {
    for (const area of AREAS) {
      expect(QUESTIONS.filter((q) => q.areas.includes(area.id)).length).toBeGreaterThanOrEqual(GATES_PER_AREA * 3);
    }
  });
});

describe('gate placement', () => {
  it(`places ${GATES_PER_AREA} gates per area, in order, inside the area, with different questions`, () => {
    for (const seed of SEEDS) {
      const gates = gatePlan(seed);
      expect(gates).toHaveLength(AREAS.length * GATES_PER_AREA);
      expect(new Set(gates.map((g) => g.questionId)).size).toBe(gates.length);
      gates.forEach((g, i) => {
        expect(g.index).toBe(i);
        expect(areaAt(g.z).id).toBe(g.areaId);
        expect(questionById(g.questionId).areas).toContain(g.areaId);
        // The next question only appears once the previous gate is behind the player
        if (i > 0) expect(g.showZ).toBeGreaterThan(gates[i - 1].z);
      });
      expect(gates[0].showZ).toBeGreaterThan(CHUNK_LENGTH);
      // The last answer's feedback is on screen before the finish line
      expect(gates.at(-1)!.z + GATE_CLEAR_AFTER_M).toBeLessThan(COURSE_LENGTH_M - FINISH_CLEAR_M / 2);
    }
  });

  it('puts the right answer in the lane it says, and shuffles which lane that is', () => {
    const lanes = new Set<number>();
    for (const seed of SEEDS) {
      for (const g of gatePlan(seed)) {
        expect([...g.laneChoices].sort()).toEqual([0, 1, 2]);
        expect(g.laneChoices[g.correctLane]).toBe(questionById(g.questionId).answer);
        lanes.add(g.correctLane);
      }
    }
    expect(lanes.size).toBe(3);
  });

  it('is seeded: same seed, same gates; different seeds, different questions', () => {
    expect(gatePlan('A')).toEqual(gatePlan('A'));
    expect(gatePlan('A').map((g) => g.questionId)).not.toEqual(gatePlan('B').map((g) => g.questionId));
  });

  it('keeps every gate zone free of hazards', () => {
    for (const seed of SEEDS) {
      const gates = gatePlan(seed);
      const obstacles = Array.from({ length: LAST_CHUNK + 1 }, (_, i) => generateChunk(i, seed)).flatMap((c) => c.obstacles);
      expect(obstacles.length).toBeGreaterThan(30); // a real course, not an empty one
      expect(obstacles.filter((o) => inGateClearZone(o.zPos, gates))).toEqual([]);
    }
  });
});

describe('answering gates', () => {
  const clearTrack = (sim: GameSimulation) => sim.chunks.forEach((c) => ((c.obstacles = []), (c.collectibles = [])));

  /** Runs a sim with an empty track to the first gate, standing in `lane`. */
  function runToFirstGate(lane: 0 | 1 | 2) {
    const sim = new GameSimulation('ANSWER');
    clearTrack(sim);
    const gate = sim.gates[0];
    const events: SimEvent[] = [];
    while (sim.nextGate === 0) {
      const actions = sim.player.lane < lane ? (['RIGHT'] as const) : sim.player.lane > lane ? (['LEFT'] as const) : [];
      events.push(...sim.step(actions));
      clearTrack(sim);
    }
    return { sim, gate, events };
  }

  it('shows the question about 5 seconds before the gate', () => {
    const { gate, events, sim } = runToFirstGate(1);
    const shown = events.findIndex((e) => e.type === 'GATE_SHOWN');
    const answered = events.findIndex((e) => e.type === 'GATE_ANSWERED');
    expect(shown).toBeGreaterThan(-1);
    expect(answered).toBeGreaterThan(shown);
    expect(gate.z - gate.showZ).toBe(GATE_SHOW_SEC * signalAt(gate.z).speed);
    // The player crosses that distance in about 5 s (a bit more while easing up to signal pace)
    const shownTicks = sim.tick - Math.round((gate.showZ / signalAt(gate.z).speed) * 60);
    expect(shownTicks).toBeGreaterThan(0);
    expect(sim.activeGate).toBeNull();
  });

  it('the right lane scores 500 x signal and charges Bayanihan', () => {
    const correctLane = gatePlan('ANSWER')[0].correctLane;
    const { sim, events } = runToFirstGate(correctLane);
    const answer = events.find((e) => e.type === 'GATE_ANSWERED');
    expect(answer).toMatchObject({ correct: true, chosenLane: correctLane, points: gatePoints(sim.signal) });
    expect(sim.gatesCorrect).toBe(1);
    expect(sim.wrongQuestionIds).toEqual([]);
    expect(sim.bayanihanGauge).toBeGreaterThan(0);
  });

  it('a wrong lane scores nothing for the gate and adds the question to the lessons', () => {
    const gate = gatePlan('ANSWER')[0];
    const wrongLane = ((gate.correctLane + 1) % 3) as 0 | 1 | 2;
    const right = runToFirstGate(gate.correctLane).sim;
    const { sim, events } = runToFirstGate(wrongLane);
    expect(events.find((e) => e.type === 'GATE_ANSWERED')).toMatchObject({ correct: false, points: 0 });
    expect(sim.gatesCorrect).toBe(0);
    expect(sim.wrongQuestionIds).toEqual([gate.questionId]);
    expect(right.score - sim.score).toBe(gatePoints(right.signal));
  });
});

describe('quiz gates in a full match', () => {
  it.each(SEEDS.slice(0, 4))('%s: answering all correctly gets 8/8, all wrong gets 0/8 with 8 lessons', (seed) => {
    const good = playAutopilot(seed, { quiz: 'correct' }).sim.result();
    const bad = playAutopilot(seed, { quiz: 'wrong' }).sim.result();
    expect(good.finished).toBe(true);
    expect(bad.finished).toBe(true);
    expect(good.gatesCorrect).toBe(good.gatesTotal);
    expect(good.wrongQuestionIds).toEqual([]);
    expect(bad.gatesCorrect).toBe(0);
    expect(bad.wrongQuestionIds).toEqual(gatePlan(seed).map((g) => g.questionId));
  });

  it('each correct gate pays 500 x the signal level at that gate', () => {
    const { events } = playAutopilot('QUIZ-1', { quiz: 'correct' });
    const answers = events.filter((e): e is Extract<SimEvent, { type: 'GATE_ANSWERED' }> => e.type === 'GATE_ANSWERED');
    expect(answers.map((a) => a.points)).toEqual(gatePlan('QUIZ-1').map((g) => gatePoints(signalAt(g.z).level)));
  });

  it('the server replay reproduces gate answers', () => {
    const live = playAutopilot('QUIZ-REPLAY', { quiz: 'correct' });
    const result = replay('QUIZ-REPLAY', live.inputLog, live.sim.tick);
    expect(result).toEqual(live.sim.result());
    expect(result.gatesCorrect).toBe(8);
  });
});
