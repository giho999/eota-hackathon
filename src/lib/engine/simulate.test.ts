import { describe, it, expect } from 'vitest';
import { simulate, type Segment } from './simulate';

const constantSegment = (id: string, value: number): Segment => ({
  id,
  label: id,
  dist: { kind: 'constant', value },
  source: 'test',
});

describe('simulate', () => {
  it('same seed produces identical results', () => {
    const segments: Segment[] = [
      { id: 'a', label: 'a', dist: { kind: 'gamma', shape: 2, scale: 6 }, source: 'test' },
      { id: 'b', label: 'b', dist: { kind: 'normal', mean: 10, sd: 2 }, source: 'test' },
    ];
    const input = { segments, baseTimeMin: 0, deadlineMin: 100, iterations: 1000, seed: 42 };
    const r1 = simulate(input);
    const r2 = simulate(input);
    expect(r1.probability).toBe(r2.probability);
    expect(r1.percentiles).toEqual(r2.percentiles);
    expect(r1.histogram).toEqual(r2.histogram);
  });

  it('constant distributions only -> probability 0 or 1', () => {
    const segments: Segment[] = [constantSegment('a', 10), constantSegment('b', 20)];
    // total = 30, deadline = 50 -> always success
    const r1 = simulate({ segments, baseTimeMin: 0, deadlineMin: 50, iterations: 1000, seed: 1 });
    expect(r1.probability).toBe(1);
    // total = 30, deadline = 20 -> always fail
    const r2 = simulate({ segments, baseTimeMin: 0, deadlineMin: 20, iterations: 1000, seed: 1 });
    expect(r2.probability).toBe(0);
  });

  it('deadlineMin = Infinity -> probability 1', () => {
    const segments: Segment[] = [
      { id: 'a', label: 'a', dist: { kind: 'gamma', shape: 5, scale: 10 }, source: 'test' },
    ];
    const r = simulate({ segments, baseTimeMin: 0, deadlineMin: Infinity, iterations: 1000, seed: 7 });
    expect(r.probability).toBe(1);
  });

  it('removing baggage segment raises probability', () => {
    const base: Segment[] = [
      { id: 'flight', label: 'flight', dist: { kind: 'gamma', shape: 2, scale: 6 }, source: 'test' },
      { id: 'immigration', label: 'immigration', dist: { kind: 'gamma', shape: 3, scale: 2 }, source: 'test' },
    ];
    const withBaggage: Segment[] = [
      ...base,
      { id: 'baggage', label: 'baggage', dist: { kind: 'normal', mean: 18, sd: 6 }, source: 'test' },
    ];
    const deadline = 60;
    const rWith = simulate({ segments: withBaggage, baseTimeMin: 0, deadlineMin: deadline, iterations: 5000, seed: 99 });
    const rWithout = simulate({ segments: base, baseTimeMin: 0, deadlineMin: deadline, iterations: 5000, seed: 99 });
    expect(rWithout.probability).toBeGreaterThan(rWith.probability);
  });
});
