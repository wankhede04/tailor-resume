/**
 * Fractional indexing for board ordering. See TechSpec §5.4.
 *
 * Wraps the well-tested `fractional-indexing` library (the spec's choice)
 * and exposes the helpers we need throughout the app.
 *
 * On rebalance threshold (key length > 50), callers should run a background
 * job to re-rank the column.
 */

import { generateKeyBetween, generateNKeysBetween } from 'fractional-indexing';

export const REBALANCE_THRESHOLD = 50;
export const INITIAL_RANK = 'a0';

/**
 * Returns a key strictly greater than `prev` and strictly less than `next`.
 * Either may be `null` to signal an open boundary (start or end of list).
 */
export function rankBetween(prev: string | null, next: string | null): string {
  return generateKeyBetween(prev, next);
}

/** Append a key after `prev`. Useful when adding to the end of a column. */
export function rankAfter(prev: string | null): string {
  return rankBetween(prev, null);
}

/** Prepend a key before `next`. */
export function rankBefore(next: string | null): string {
  return rankBetween(null, next);
}

/** Reassign N evenly-spaced ranks; used by rebalancing. */
export function rebalance(count: number): string[] {
  if (count <= 0) return [];
  return generateNKeysBetween(null, null, count);
}

export function shouldRebalance(rank: string): boolean {
  return rank.length > REBALANCE_THRESHOLD;
}
