import { GameSimulation } from '../shared/sim/simulation';
import { JUMP_AIR_SEC } from '../shared/sim/constants';
import type { Action, InputEvent, SimEvent } from '../shared/sim/types';

/**
 * A simple bot that plays a whole run: jumps holes and low hazards so it peaks over them,
 * slides under overhead ones, changes lanes around lane blockers, and fires Bayanihan when ready.
 * Used by tests to produce long, realistic input logs.
 */
export function playAutopilot(seed: string, maxTicks = 20000) {
  const sim = new GameSimulation(seed);
  const inputLog: InputEvent[] = [];
  const events: SimEvent[] = [];

  while (sim.status === 'RUNNING' && sim.tick < maxTicks) {
    const actions: Action[] = [];
    const lane = sim.player.lane;
    const speed = sim.effectiveSpeed;
    const ahead = sim.chunks
      .flatMap((c) => c.obstacles)
      .filter((o) => !o.cleared && o.zPos > sim.playerZ - 2);
    const inLane = (l: number, within: number) => ahead.filter((o) => o.lane === l && o.zPos - sim.playerZ < within);
    const next = inLane(lane, 40).sort((a, b) => a.zPos - b.zPos)[0];

    if (sim.bayanihanGauge >= 40 && !sim.isBayanihanActive) {
      actions.push('BAYANIHAN');
    } else if (next) {
      const dz = next.zPos - sim.playerZ;
      const lookahead = speed * 0.9;
      if (next.type === 'moving_train' && dz < lookahead) {
        const free = [lane - 1, lane + 1].filter((l) => l >= 0 && l <= 2 && inLane(l, lookahead).length === 0);
        if (free.length) actions.push(free[0] < lane ? 'LEFT' : 'RIGHT');
      } else if ((next.type === 'barrier_low' || next.type === 'pitfall') && sim.player.isGrounded) {
        // Take off so the apex lands on the hazard
        if (dz <= speed * (JUMP_AIR_SEC / 2) + 0.5) actions.push('JUMP');
      } else if (next.type === 'barrier_high' && !sim.player.isSliding && dz < speed * 0.25) {
        actions.push('SLIDE');
      }
    }

    for (const action of actions) inputLog.push({ tick: sim.tick, action });
    events.push(...sim.step(actions));
  }
  return { sim, inputLog, events };
}
