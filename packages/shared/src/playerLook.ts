/**
 * A player's avatar: a mini Eko robot in their colour, with one of Eko's
 * visor faces and a top piece. Each part is an index; the drawings and the
 * colours live in the web app (AVATAR_COLORS, BotAvatar), in this order.
 */
export interface AvatarLook {
  color: number;
  face: number;
  top: number;
}

/** Blue, pink, mint, amber, violet, cyan, orange, ink, red. */
export const AVATAR_COLOR_COUNT = 9;
/** Happy, neutral, starry, love, whoa, focused, sleepy, oops, wink. */
export const AVATAR_FACE_COUNT = 9;
/** Nothing, antenna, headphones, cap, crown, party hat, bow, sprout. */
export const AVATAR_TOP_COUNT = 8;

/** The first colour no one in the room is using. */
export function pickColorIndex(taken: number[]): number {
  const used = new Set(taken);
  for (let i = 0; i < AVATAR_COLOR_COUNT; i += 1) {
    if (!used.has(i)) return i;
  }
  // Only reachable if the room outgrows the palette.
  return taken.length % AVATAR_COLOR_COUNT;
}

export function randomLook(random: () => number = Math.random): AvatarLook {
  const pick = (n: number) => Math.min(n - 1, Math.floor(random() * n));
  return { color: pick(AVATAR_COLOR_COUNT), face: pick(AVATAR_FACE_COUNT), top: pick(AVATAR_TOP_COUNT) };
}

/** A stable look from an id, for players who never chose one. */
export function lookFromSeed(seed: string): AvatarLook {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return {
    color: h % AVATAR_COLOR_COUNT,
    face: Math.floor(h / AVATAR_COLOR_COUNT) % AVATAR_FACE_COUNT,
    top: Math.floor(h / (AVATAR_COLOR_COUNT * AVATAR_FACE_COUNT)) % AVATAR_TOP_COUNT,
  };
}

function part(value: unknown, count: number): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value < count ? value : null;
}

/** A look sent by a client, if it's a real one; anything else is null. */
export function sanitizeLook(value: unknown): AvatarLook | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as Record<string, unknown>;
  const color = part(v.color, AVATAR_COLOR_COUNT);
  const face = part(v.face, AVATAR_FACE_COUNT);
  const top = part(v.top, AVATAR_TOP_COUNT);
  if (color === null || face === null || top === null) return null;
  return { color, face, top };
}
