import {
  SPEED_CHOICE_MAX_POINTS,
  SPEED_CHOICE_MIN_POINTS,
  TYPING_ARTIST_POINTS,
  TYPING_BOTH_POINTS,
  TYPING_TITLE_POINTS,
} from './constants.js';
import { answersMatch, normalizeAnswer } from './normalize.js';

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
  bothCorrect: boolean;
}

/** Evaluate a single free-text guess against artist + title */
export function evaluateTypingGuess(
  correctArtists: string[],
  correctTitle: string,
  guess: string,
): TypingScoreResult {
  const trimmed = guess.trim();
  if (!trimmed) {
    return {
      points: 0,
      artistCorrect: false,
      titleCorrect: false,
      bothCorrect: false,
    };
  }

  const titleCorrect = answersMatch(correctTitle, trimmed);
  const artistCorrect = correctArtists.some((a) => answersMatch(a, trimmed));

  const normalizedGuess = normalizeAnswer(trimmed);
  const bothInOneField =
    titleCorrect &&
    artistCorrect &&
    correctArtists.some((a) => {
      const na = normalizeAnswer(a);
      return na.length > 0 && normalizedGuess.includes(na);
    });

  let points = 0;
  if (bothInOneField || (titleCorrect && artistCorrect)) {
    points = TYPING_BOTH_POINTS;
  } else if (artistCorrect) {
    points = TYPING_ARTIST_POINTS;
  } else if (titleCorrect) {
    points = TYPING_TITLE_POINTS;
  }

  return {
    points,
    artistCorrect,
    titleCorrect,
    bothCorrect: bothInOneField || (titleCorrect && artistCorrect),
  };
}

export function scoreTypingFromGuess(
  correctArtists: string[],
  correctTitle: string,
  guess: string,
  timeRemainingMs: number,
  roundDurationMs: number,
): number {
  const result = evaluateTypingGuess(correctArtists, correctTitle, guess);
  return applyTypingTimeBonus(result.points, timeRemainingMs, roundDurationMs);
}

/** @deprecated Use evaluateTypingGuess — kept for tests/migration */
export function scoreTypingBase(
  correctArtists: string[],
  correctTitle: string,
  submittedArtist: string,
  submittedTitle: string,
): TypingScoreResult {
  const combined = [submittedArtist, submittedTitle].filter(Boolean).join(' ').trim();
  if (combined) return evaluateTypingGuess(correctArtists, correctTitle, combined);
  return evaluateTypingGuess(correctArtists, correctTitle, '');
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
