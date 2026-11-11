export interface Ranked<T> {
  entry: T;
  position: number;
}

export interface ShortBoard<T> {
  top: Ranked<T>[];
  /** Your own row when it isn't already in `top`. */
  mine: Ranked<T> | null;
  /** How many rows are left out. */
  more: number;
}

/**
 * A leaderboard short enough to read across a room: the first `show` rows,
 * then your own place if it's further down. With `compact` off (a small
 * room) it's everyone.
 */
export function shortBoard<T extends { playerId: string }>(
  entries: T[],
  myId: string | null | undefined,
  { compact, show = 5, firstPosition = 1 }: { compact: boolean; show?: number; firstPosition?: number },
): ShortBoard<T> {
  const ranked = entries.map((entry, i) => ({ entry, position: firstPosition + i }));
  if (!compact || ranked.length <= show) return { top: ranked, mine: null, more: 0 };
  const top = ranked.slice(0, show);
  const mineIndex = ranked.findIndex((r) => r.entry.playerId === myId);
  const mine = mineIndex >= show ? ranked[mineIndex]! : null;
  return { top, mine, more: ranked.length - show - (mine ? 1 : 0) };
}
