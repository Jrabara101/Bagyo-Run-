/**
 * Mulberry32 PRNG Implementation
 * High performance deterministic pseudo-random number generator.
 * Produces identical sequences on both client and server for seeded runs.
 */
export class Mulberry32 {
  private state: number;

  constructor(seed: string | number) {
    if (typeof seed === 'number') {
      this.state = seed >>> 0;
    } else {
      this.state = Mulberry32.hashString(seed);
    }
  }

  public static hashString(str: string): number {
    let hash = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193);
    }
    return hash >>> 0;
  }

  /**
   * Generates a pseudorandom float between 0 (inclusive) and 1 (exclusive)
   */
  public next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Generates a pseudorandom integer between min (inclusive) and max (inclusive)
   */
  public nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /**
   * Generates a random boolean with specified probability (default 0.5)
   */
  public nextBool(prob = 0.5): boolean {
    return this.next() < prob;
  }

  /**
   * Picks a random item from an array
   */
  public pick<T>(arr: T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }
}
