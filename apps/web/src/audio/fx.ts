import type { LobbyState } from '@wemsic/shared';
import type { SfxName } from './sfx';

/**
 * What kind of device this is in the game:
 * - `screen`: the host's big screen in host mode (the room's speaker).
 * - `player`: an online player, with sound on their own device.
 * - `pad`: a phone in host mode, which stays silent and only buzzes.
 */
export type DeviceRole = 'screen' | 'player' | 'pad';

export function deviceRole(lobby: LobbyState | null | undefined, playerId: string | undefined): DeviceRole {
  if (lobby?.settings.roomType !== 'host') return 'player';
  return lobby.hostPlayerId === playerId ? 'screen' : 'pad';
}

/** Phone buzz patterns, in milliseconds of buzz, pause, buzz… */
export const BUZZES = {
  lockIn: [20],
  correct: [30, 70, 20, 40, 60],
  wrong: [120],
  tick: [15],
  timeUp: [250],
} as const;
export type BuzzName = keyof typeof BUZZES;

/** The game moments that make a sound, a buzz, or both. */
export type FxEvent = SfxName;

/** Which moments buzz, and with which pattern. */
const EVENT_BUZZ: Partial<Record<FxEvent, BuzzName>> = {
  countBeat: 'tick',
  go: 'lockIn',
  lockIn: 'lockIn',
  tick: 'tick',
  reveal: 'timeUp',
  correct: 'correct',
  wrong: 'wrong',
};

/** Moments only the big screen hears: the room-wide ones. */
const SCREEN_SOUNDS = new Set<FxEvent>(['countBeat', 'go', 'someone', 'tick', 'reveal', 'winner']);
/** Moments an online player hears on their own device. */
const PLAYER_SOUNDS = new Set<FxEvent>(['countBeat', 'go', 'lockIn', 'tick', 'reveal', 'correct', 'wrong', 'winner']);

/**
 * For one moment on one kind of device: play the sound? buzz, and how?
 * The big screen never buzzes (it isn't in anyone's hand) and phones in host
 * mode never play sound (the big screen is the speaker).
 */
export function fxPlan(event: FxEvent, role: DeviceRole): { sound: boolean; buzz: BuzzName | null } {
  if (role === 'screen') return { sound: SCREEN_SOUNDS.has(event), buzz: null };
  const buzz = EVENT_BUZZ[event] ?? null;
  if (role === 'pad') return { sound: false, buzz };
  return { sound: PLAYER_SOUNDS.has(event), buzz };
}

/** Buzz the phone, where the browser allows it (Android); does nothing elsewhere. */
export function buzz(name: BuzzName): void {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate([...BUZZES[name]]);
    }
  } catch {
    // Some browsers throw instead of ignoring it; a missing buzz is fine.
  }
}

/**
 * Which second of the last five just started, or null. Fires once as the
 * countdown crosses 5, 4, 3, 2 and 1, and not when you arrive mid-countdown
 * (no previous reading) or the clock jumps back up.
 */
export function tickSecond(previousMs: number | null, nowMs: number): number | null {
  if (previousMs === null) return null;
  const before = Math.ceil(previousMs / 1000);
  const now = Math.ceil(nowMs / 1000);
  if (now >= before || now < 1 || now > 5) return null;
  return now;
}

/** At a reveal: did this player score? Null for someone not playing (the big screen). */
export function revealOutcome(roundScores: Record<string, number>, playerId: string): 'correct' | 'wrong' | null {
  if (!(playerId in roundScores)) return null;
  return (roundScores[playerId] ?? 0) > 0 ? 'correct' : 'wrong';
}
