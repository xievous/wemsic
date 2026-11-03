import type { EkoFace, EkoMove } from './Eko';

/** The upbeat moves Eko cycles through in a game; slump and sway are for moods. */
export const GAME_MOVES: readonly EkoMove[] = ['bob', 'pump', 'step', 'spin', 'jump', 'robot', 'roof'];

/**
 * The dance for one round or its reveal. The order is a shuffle seeded by the
 * room code, so everyone in the room sees the same dance, and it changes from
 * each round to its reveal to the next round.
 */
export function danceMove(roomCode: string, roundIndex: number, phase: 'round' | 'reveal'): EkoMove {
  const order = shuffled(GAME_MOVES, roomCode.toUpperCase());
  return order[(roundIndex * 2 + (phase === 'reveal' ? 1 : 0)) % order.length]!;
}

/** Eko's face while a song plays. */
export function roundFace({
  timeLeft,
  typing,
  soundOn,
}: {
  timeLeft: number;
  typing: boolean;
  soundOn: boolean;
}): EkoFace {
  if (!soundOn) return 'sleepy';
  if (timeLeft <= 0) return 'neutral';
  if (timeLeft <= 5000) return 'whoa';
  return typing ? 'focused' : 'happy';
}

/**
 * Eko at the reveal: starstruck when you scored, a slumped "oops" when you
 * didn't. The host screen doesn't score, so its Eko always celebrates.
 */
export function revealMood(
  roomCode: string,
  roundIndex: number,
  myScore: number,
  presenter: boolean,
): { face: EkoFace; move: EkoMove } {
  if (!presenter && myScore <= 0) return { face: 'oops', move: 'slump' };
  return { face: 'starry', move: danceMove(roomCode, roundIndex, 'reveal') };
}

function shuffled<T>(items: readonly T[], seed: string): T[] {
  const rand = seededRandom(seed);
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

/** FNV-1a hash of the seed feeding a mulberry32 generator. */
function seededRandom(seed: string): () => number {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => {
    h = (h + 0x6d2b79f5) | 0;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
