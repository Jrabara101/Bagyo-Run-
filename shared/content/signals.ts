export type SignalLevel = 1 | 2 | 3 | 4 | 5;

/**
 * PAGASA Tropical Cyclone Wind Signal levels as they rise along the course.
 * `speed` sets the run pace (m/s); `hazardSegments` is hazard groups per 120 m chunk.
 * `rain` and `wind` (0..1) drive visuals only and never affect the simulation.
 */
export interface Signal {
  level: SignalLevel;
  startM: number;
  speed: number;
  hazardSegments: number;
  /** Lane-blocking hazards (swept jeepney, floating debris) start appearing at this level. */
  laneHazards: boolean;
  rain: number;
  wind: number;
}

export const SIGNALS: readonly Signal[] = [
  { level: 1, startM: 0, speed: 17, hazardSegments: 2, laneHazards: false, rain: 0.15, wind: 0.1 },
  { level: 2, startM: 400, speed: 19, hazardSegments: 3, laneHazards: true, rain: 0.35, wind: 0.3 },
  { level: 3, startM: 900, speed: 21, hazardSegments: 3, laneHazards: true, rain: 0.55, wind: 0.5 },
  { level: 4, startM: 1500, speed: 23, hazardSegments: 4, laneHazards: true, rain: 0.75, wind: 0.8 },
  { level: 5, startM: 2100, speed: 25, hazardSegments: 5, laneHazards: true, rain: 1, wind: 1 },
];

export function signalAt(meters: number): Signal {
  for (let i = SIGNALS.length - 1; i >= 0; i--) {
    if (meters >= SIGNALS[i].startM) return SIGNALS[i];
  }
  return SIGNALS[0];
}
