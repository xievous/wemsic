import { MAX_PLAYERS } from './constants.js';

/**
 * How many avatar colours there are. At least MAX_PLAYERS, so everyone in a
 * full room still gets a colour no one else has. The colours themselves live
 * in the web theme (AVATAR_COLORS), in this order.
 */
export const AVATAR_COLOR_COUNT = Math.max(8, MAX_PLAYERS);

/** The first colour no one in the room is using. */
export function pickColorIndex(taken: number[]): number {
  const used = new Set(taken);
  for (let i = 0; i < AVATAR_COLOR_COUNT; i += 1) {
    if (!used.has(i)) return i;
  }
  // Only reachable if the room outgrows the palette.
  return taken.length % AVATAR_COLOR_COUNT;
}

function letters(word: string): string[] {
  return [...word.toUpperCase()].filter((c) => /\p{L}|\p{N}/u.test(c));
}

/**
 * Two-character initials no one else in the room has. "Oscar Lam" is OL and
 * "Sam" is SA; a second "Sara" then becomes SR (first letter plus the next
 * one that makes it unique), and as a last resort S2, S3...
 */
export function pickInitials(displayName: string, taken: string[]): string {
  const used = new Set(taken.map((t) => t.toUpperCase()));
  const words = displayName.trim().split(/\s+/).map(letters).filter((w) => w.length > 0);
  const all = words.flat();
  if (all.length === 0) {
    for (let n = 1; ; n += 1) {
      const c = n === 1 ? '?' : `?${n}`;
      if (!used.has(c)) return c;
    }
  }

  const first = all[0]!;
  const candidates: string[] = [];
  if (words.length > 1) candidates.push(first + words[words.length - 1]![0]);
  for (const c of all.slice(1)) candidates.push(first + c);
  if (all.length === 1) candidates.push(first);

  for (const c of candidates) {
    if (!used.has(c)) return c;
  }
  for (let n = 2; ; n += 1) {
    const c = `${first}${n}`;
    if (!used.has(c)) return c;
  }
}
