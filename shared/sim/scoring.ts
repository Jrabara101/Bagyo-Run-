/**
 * The score formula (ARCHITECTURE.md section 2). Only the simulation calls these, so the server
 * replay computes the same number as the client.
 *
 *   distance points + supplies x combo + correct gates x 500 x signal + near-miss combo
 *   + Go-Bag complete bonus + finish bonus + 1,000 per heart remaining
 */
export const SCORE = {
  perMeter: 8,
  supply: 100,
  nearMiss: 250,
  goBagItem: 250,
  goBagComplete: 3000,
  gateCorrect: 500,
  finish: 5000,
  perHeart: 1000,
} as const;

export const COMBO_STEP = 0.25;
export const MAX_COMBO = 5.0;

export function distancePoints(meters: number, combo: number): number {
  return Math.floor(meters * SCORE.perMeter * combo);
}

export function supplyPoints(combo: number): number {
  return Math.floor(SCORE.supply * combo);
}

/** Near-miss points use the combo after this near miss raised it. */
export function nearMissPoints(combo: number): number {
  return Math.floor(SCORE.nearMiss * combo);
}

export function nextCombo(combo: number): number {
  return Math.min(MAX_COMBO, combo + COMBO_STEP);
}

export function gatePoints(signalLevel: number): number {
  return SCORE.gateCorrect * signalLevel;
}

export function finishBonus(heartsLeft: number): number {
  return SCORE.finish + heartsLeft * SCORE.perHeart;
}
