import { describe, expect, it } from 'vitest';
import { generateChunk } from '../shared/sim/course';

describe('course generation', () => {
  it('produces the same chunk for the same seed and index', () => {
    for (let i = 0; i < 20; i++) {
      expect(generateChunk(i, 'TEST-SEED')).toEqual(generateChunk(i, 'TEST-SEED'));
    }
  });

  it('produces different layouts for different seeds', () => {
    const a = JSON.stringify(generateChunk(5, 'SEED-A').obstacles);
    const b = JSON.stringify(generateChunk(5, 'SEED-B').obstacles);
    expect(a).not.toEqual(b);
  });

  it('keeps the first chunk free of hazards', () => {
    expect(generateChunk(0, 'ANY').obstacles).toHaveLength(0);
  });
});
