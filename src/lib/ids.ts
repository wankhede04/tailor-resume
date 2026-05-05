/**
 * ULID-prefixed IDs per TechSpec §4.1 — `{prefix}_{ulid}`.
 */

import { ulid } from 'ulid';

export type IdPrefix =
  | 'wsp'
  | 'usr'
  | 'prj'
  | 'col'
  | 'tkt'
  | 'lbl'
  | 'cmt'
  | 'evt'
  | 'att'
  | 'scl' // slack channel link
  | 'rpf' // resume profile
  | 'rap'; // resume application

export function newId(prefix: IdPrefix): string {
  return `${prefix}_${ulid()}`;
}
