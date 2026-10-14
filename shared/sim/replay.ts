import { Action, InputEvent, RunResult } from './types';
import { GameSimulation } from './simulation';

/**
 * Re-runs a match from its seed and input log. Stops when the run ends or after `maxTicks`
 * (the tick count the client reported), whichever comes first.
 */
export function replay(seed: string, inputLog: readonly InputEvent[], maxTicks: number): RunResult {
  const sim = new GameSimulation(seed);
  let next = 0;

  while (sim.status === 'RUNNING' && sim.tick < maxTicks) {
    const actions: Action[] = [];
    // Inputs stamped earlier than the current tick (malformed log) are applied now, not dropped.
    while (next < inputLog.length && inputLog[next].tick <= sim.tick) {
      actions.push(inputLog[next].action);
      next++;
    }
    sim.step(actions);
  }

  return sim.result();
}
