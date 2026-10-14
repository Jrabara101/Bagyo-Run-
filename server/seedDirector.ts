import { Mulberry32 } from '../src/engine/prng.js';
import { db } from './db.js';

export interface DailySeedData {
  seed: string;
  dateKey: string;
  dailyTitle: string;
  dailyModifiers: string[];
  topRecord?: {
    playerName: string;
    distance: number;
    score: number;
  };
}

export class SeedDirector {
  /**
   * Generates or retrieves the globally synchronized daily seed configuration for today
   */
  public static getDailySeed(): DailySeedData {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const dateKey = `DAILY-${today}`;

    // Check if daily seed exists in DB
    const existing = db.prepare('SELECT * FROM daily_seeds WHERE date_key = ?').get(dateKey) as
      | { date_key: string; seed: string; title: string; modifiers_json: string }
      | undefined;

    if (existing) {
      const topRecord = db
        .prepare('SELECT player_name, distance, score FROM runs WHERE seed = ? ORDER BY distance DESC LIMIT 1')
        .get(existing.seed) as { player_name: string; distance: number; score: number } | undefined;

      return {
        seed: existing.seed,
        dateKey: existing.date_key,
        dailyTitle: existing.title,
        dailyModifiers: JSON.parse(existing.modifiers_json),
        topRecord: topRecord
          ? {
              playerName: topRecord.player_name,
              distance: topRecord.distance,
              score: topRecord.score,
            }
          : undefined,
      };
    }

    // Generate deterministic daily title and modifiers from date seed
    const rng = new Mulberry32(dateKey);
    const seed = `GAUNTLET-${today}-${rng.nextInt(1000, 9999)}`;

    const titles = [
      'CHASM RUNNER: ZERO HORIZON',
      'VELOCITY MATRIX: SOLAR PROTOCOL',
      'HYPERION GAUNTLET: ORBITAL CRASH',
      'NEON PULSE: SUBTERRANEAN VOID',
      'MAGMA ACCELERATOR: VOLCANIC SPRINT',
    ];
    const title = rng.pick(titles);

    const modifierOptions = [
      'Slipstream Overdrive: +25% Duration',
      'Near-Miss Spark Multiplier: 1.5x Bonus',
      'Low-Gravity Skybridge at 1000m',
      'Dual Hazard Laser Frequency Increased',
      'Magnet Pulse Active for High Speeds',
    ];

    const selectedModifiers = [rng.pick(modifierOptions), rng.pick(modifierOptions)];

    db.prepare('INSERT INTO daily_seeds (date_key, seed, title, modifiers_json) VALUES (?, ?, ?, ?)').run(
      dateKey,
      seed,
      title,
      JSON.stringify(selectedModifiers)
    );

    return {
      seed,
      dateKey,
      dailyTitle: title,
      dailyModifiers: selectedModifiers,
    };
  }

  public static getCustomSeed(customSeed: string) {
    const rng = new Mulberry32(customSeed);
    return {
      seed: customSeed,
      title: `CUSTOM RUN // SEED #${customSeed.toUpperCase()}`,
      modifiers: ['Standard Velocity Regulations', 'Server-Verified Anti-Cheat Active'],
    };
  }
}
