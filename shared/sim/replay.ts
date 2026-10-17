import { Action, GhostPoint, InputEvent, RunResult } from './types';
import { GameSimulation, TICK_MS } from './simulation';

/** Steps a fresh simulation through an input log, calling `onTick` after every tick. */
function run(seed: string, inputLog: readonly InputEvent[], maxTicks: number, onTick?: (sim: GameSimulation) => void) {
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
    onTick?.(sim);
  }
  return sim;
}

/**
 * Re-runs a match from its seed and input log. Stops when the run ends or after `maxTicks`
 * (the tick count the client reported), whichever comes first.
 */
export function replay(seed: string, inputLog: readonly InputEvent[], maxTicks: number): RunResult {
  return run(seed, inputLog, maxTicks).result();
}

/** The run's path for ghost playback: position and lane every `everyTicks` ticks. */
export function ghostPath(seed: string, inputLog: readonly InputEvent[], maxTicks: number, everyTicks = 6): GhostPoint[] {
  const points: GhostPoint[] = [];
  run(seed, inputLog, maxTicks, (sim) => {
    if (sim.tick % everyTicks === 0 || sim.status !== 'RUNNING') {
      points.push({ timeMs: Math.round(sim.tick * TICK_MS), lane: sim.player.lane, z: Math.round(sim.playerZ * 10) / 10 });
    }
  });
  return points;
}
