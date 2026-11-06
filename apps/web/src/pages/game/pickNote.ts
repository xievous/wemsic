import type { GameMode, McqOption } from '@wemsic/shared';

/**
 * The line under "No points" at a speed-choice reveal: what you picked, or
 * that you didn't pick in time. A correct pick always scores, so any points
 * mean there's nothing to explain. Typing rounds have their own feedback.
 */
export function missedPickNote(
  gameMode: GameMode,
  pick: McqOption | null,
  score: number,
): string | null {
  if (gameMode !== 'speed_choice' || score > 0) return null;
  return pick ? `You picked “${pick.label}”` : "You didn't pick in time";
}
