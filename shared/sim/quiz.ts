import { Mulberry32 } from './rng';
import type { AreaId, LaneIndex } from './types';
import { AREAS } from '../content/areas';
import { QUESTIONS, questionById } from '../content/questions';
import { signalAt } from '../content/signals';

export const GATES_PER_AREA = 2; // keep in step with `gatesAtM` in shared/content/areas.ts
/** The question appears this many seconds (at the gate's signal pace) before the gate. */
export const GATE_SHOW_SEC = 5;
/** No hazards from this far before a gate... */
export const GATE_CLEAR_BEFORE_M = 60;
/** ...to this far after it, so the player can pick a lane, and leave it, without a hazard right there. */
export const GATE_CLEAR_AFTER_M = 30;
/** Each gate moves up to this many meters either way from its spot in `Area.gatesAtM`. */
const GATE_JITTER_M = 12;

export interface QuizGate {
  index: number;
  z: number;
  /** Where the question appears. */
  showZ: number;
  areaId: AreaId;
  questionId: string;
  /** Which of the question's choices stands in each lane, left to right (A, B, C). */
  laneChoices: [number, number, number];
  correctLane: LaneIndex;
}

/**
 * The quiz gates for this seed: one at each of the area's `gatesAtM` spots, each with a different
 * question drawn from the area's pool and the choices shuffled into the lanes. Everyone on the
 * same seed gets the same questions in the same lanes.
 */
export function gatePlan(seed: string): QuizGate[] {
  const rng = new Mulberry32(`${seed}_quiz`);
  const used = new Set<string>();
  const gates: QuizGate[] = [];

  for (const area of AREAS) {
    const pool = rng.shuffle(QUESTIONS.filter((q) => q.areas.includes(area.id) && !used.has(q.id)).map((q) => q.id));
    area.gatesAtM.forEach((spot, i) => {
      const questionId = pool[i];
      used.add(questionId);
      const z = spot + rng.nextInt(-GATE_JITTER_M, GATE_JITTER_M);
      const laneChoices = rng.shuffle([0, 1, 2]) as [number, number, number];
      gates.push({
        index: gates.length,
        z,
        showZ: z - GATE_SHOW_SEC * signalAt(z).speed,
        areaId: area.id,
        questionId,
        laneChoices,
        correctLane: laneChoices.indexOf(questionById(questionId).answer) as LaneIndex,
      });
    });
  }
  return gates;
}

/** True if `z` is in a gate's hazard-free zone. */
export function inGateClearZone(z: number, gates: readonly QuizGate[]): boolean {
  return gates.some((g) => z >= g.z - GATE_CLEAR_BEFORE_M && z <= g.z + GATE_CLEAR_AFTER_M);
}
