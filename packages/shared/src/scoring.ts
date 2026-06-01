import {
  SPEED_CHOICE_MAX_POINTS,
  SPEED_CHOICE_MIN_POINTS,
  TYPING_ARTIST_POINTS,
  TYPING_BOTH_POINTS,
  TYPING_TITLE_POINTS,
} from './constants.js';
import { answersMatch } from './normalize.js';

export function scoreSpeedChoice(
  correct: boolean,
  timeRemainingMs: number,
  roundDurationMs: number,
): number {
  if (!correct) return 0;
  const ratio = Math.max(0, Math.min(1, timeRemainingMs / roundDurationMs));
  const points = Math.floor(SPEED_CHOICE_MAX_POINTS * ratio);
  return Math.max(SPEED_CHOICE_MIN_POINTS, points);
}

export interface TypingScoreResult {
  points: number;
  artistCorrect: boolean;
  titleCorrect: boolean;
}

export function scoreTypingBase(
  correctArtists: string[],
  correctTitle: string,
  submittedArtist: string,
  submittedTitle: string,
): TypingScoreResult {
  const artistCorrect =
    submittedArtist.trim().length > 0 &&
    correctArtists.some((a) => answersMatch(a, submittedArtist));
  const titleCorrect =
    submittedTitle.trim().length > 0 && answersMatch(correctTitle, submittedTitle);

  let points = 0;
  if (artistCorrect && titleCorrect) {
    points = TYPING_BOTH_POINTS;
  } else if (artistCorrect) {
    points = TYPING_ARTIST_POINTS;
  } else if (titleCorrect) {
    points = TYPING_TITLE_POINTS;
  }

  return { points, artistCorrect, titleCorrect };
}

export function applyTypingTimeBonus(
  basePoints: number,
  timeRemainingMs: number,
  roundDurationMs: number,
): number {
  if (basePoints <= 0) return 0;
  const ratio = Math.max(0, Math.min(1, timeRemainingMs / roundDurationMs));
  const multiplier = 0.5 + 0.5 * ratio;
  return Math.floor(basePoints * multiplier);
}
