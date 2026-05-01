import { describe, it, expect } from 'vitest';
import {
  rankBetween,
  rankAfter,
  rankBefore,
  rebalance,
  shouldRebalance,
  INITIAL_RANK,
  REBALANCE_THRESHOLD,
} from './fractional-index';

describe('fractional-index', () => {
  it('generates an initial rank when both bounds are null', () => {
    const r = rankBetween(null, null);
    expect(r.length).toBeGreaterThan(0);
  });

  it('rankAfter produces strictly greater keys', () => {
    const a = rankAfter(null);
    const b = rankAfter(a);
    const c = rankAfter(b);
    expect(a < b).toBe(true);
    expect(b < c).toBe(true);
  });

  it('rankBefore produces strictly smaller keys', () => {
    const a = rankBefore(null);
    const b = rankBefore(a);
    const c = rankBefore(b);
    expect(a > b).toBe(true);
    expect(b > c).toBe(true);
  });

  it('rankBetween produces a key strictly between bounds', () => {
    const a = INITIAL_RANK;
    const c = rankAfter(a);
    const b = rankBetween(a, c);
    expect(a < b).toBe(true);
    expect(b < c).toBe(true);
  });

  it('handles many sequential inserts between two values', () => {
    let lo = INITIAL_RANK;
    const hi = rankAfter(rankAfter(rankAfter(lo)));
    for (let i = 0; i < 30; i++) {
      const next = rankBetween(lo, hi);
      expect(lo < next).toBe(true);
      expect(next < hi).toBe(true);
      lo = next;
    }
  });

  it('produces keys that sort correctly when assigned to a column', () => {
    const keys: string[] = [];
    let prev: string | null = null;
    for (let i = 0; i < 10; i++) {
      const r = rankAfter(prev);
      keys.push(r);
      prev = r;
    }
    const sorted = [...keys].sort();
    expect(keys).toEqual(sorted);
  });

  it('rebalance returns N evenly-spaced ascending keys', () => {
    const keys = rebalance(20);
    expect(keys).toHaveLength(20);
    const sorted = [...keys].sort();
    expect(keys).toEqual(sorted);
    keys.forEach((k) => expect(k.length).toBeLessThan(REBALANCE_THRESHOLD));
  });

  it('shouldRebalance flags overlong keys', () => {
    expect(shouldRebalance('a0')).toBe(false);
    expect(shouldRebalance('a'.repeat(REBALANCE_THRESHOLD + 1))).toBe(true);
  });
});
