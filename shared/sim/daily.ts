import { Mulberry32 } from './rng';
import { STORM_NAMES, stormTitle } from '../content/storms';
import type { DailyChallenge } from './types';

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * The daily challenge for a date (YYYY-MM-DD, Manila time). Pure, so the server and an offline
 * client agree on today's seed and storm without talking to each other.
 */
export function dailyChallenge(dateKey: string): DailyChallenge {
  if (!DATE_KEY.test(dateKey)) throw new Error(`Bad date key: ${dateKey}`);
  const rng = new Mulberry32(`${dateKey}_storm`);
  return {
    dateKey,
    seed: `BAGYO-${dateKey}`,
    storm: stormTitle(rng.pick(STORM_NAMES)),
  };
}

/** Manila is UTC+8 all year (no daylight saving). `epochMs` comes from the caller's clock. */
export function manilaDateKey(epochMs: number): string {
  const days = Math.floor((epochMs + 8 * 3600_000) / 86_400_000);
  // Days since 1970-01-01 to a civil date (Howard Hinnant's algorithm)
  const z = days + 719468;
  const era = Math.floor(z / 146097);
  const doe = z - era * 146097;
  const yoe = Math.floor((doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365);
  const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100));
  const mp = Math.floor((5 * doy + 2) / 153);
  const d = doy - Math.floor((153 * mp + 2) / 5) + 1;
  const m = mp < 10 ? mp + 3 : mp - 9;
  const y = yoe + era * 400 + (m <= 2 ? 1 : 0);
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}
