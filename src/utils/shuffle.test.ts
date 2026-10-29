import { describe, it, expect } from 'vitest';
import { shuffleArray, shuffleWithSeed } from './shuffle';

describe('shuffleArray', () => {
  it('returns an empty array when given an empty array', () => {
    expect(shuffleArray([])).toEqual([]);
  });

  it('returns a clone when given a single-element array', () => {
    expect(shuffleArray(['alpha'])).toEqual(['alpha']);
  });

  it('preserves all original elements without mutation of input', () => {
    const original = ['A', 'B', 'C', 'D', 'E'];
    const shuffled = shuffleArray(original);

    expect(shuffled).toHaveLength(original.length);
    expect([...shuffled].sort()).toEqual([...original].sort());
    expect(shuffled).not.toBe(original);
  });
});

describe('shuffleWithSeed', () => {
  it('is completely deterministic for identical seeds', () => {
    const items = ['opt_1', 'opt_2', 'opt_3', 'opt_4'];
    const seed = 'student_uid_777-q_123';

    const run1 = shuffleWithSeed(items, seed);
    const run2 = shuffleWithSeed(items, seed);

    expect(run1).toEqual(run2);
  });

  it('generates different permutations for different student seeds', () => {
    const items = ['opt_1', 'opt_2', 'opt_3', 'opt_4', 'opt_5', 'opt_6'];
    const seedA = 'student_terminal_A-q_01';
    const seedB = 'student_terminal_B-q_01';

    const runA = shuffleWithSeed(items, seedA);
    const runB = shuffleWithSeed(items, seedB);

    expect([...runA].sort()).toEqual([...runB].sort());
    expect(runA).not.toEqual(runB);
  });

  it('preserves all items without loss or duplication', () => {
    const items = [{ id: '1' }, { id: '2' }, { id: '3' }];
    const shuffled = shuffleWithSeed(items, 'seed_xyz');

    expect(shuffled).toHaveLength(3);
    const ids = shuffled.map(i => i.id).sort();
    expect(ids).toEqual(['1', '2', '3']);
  });
});
