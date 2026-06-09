import {
  SPEED_CHOICE_MAX_POINTS,
  SPEED_CHOICE_MIN_POINTS,
  TYPING_ARTIST_POINTS,
  TYPING_BOTH_POINTS,
  TYPING_TITLE_POINTS,
} from './constants.js';
import { phraseMatchesTarget, titleMatchesGuess } from './normalize.js';

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

export interface TypingSubmissionMatch {
  matchedArtist: boolean;
  matchedTitle: boolean;
}

/** Evaluate one submitted guess (strict — no auto-match on first letter) */
export function evaluateTypingSubmission(
  correctArtists: string[],
  correctTitle: string,
  guess: string,
): TypingSubmissionMatch {
  const trimmed = guess.trim();
  if (!trimmed) {
    return { matchedArtist: false, matchedTitle: false };
  }

  const matchedTitle = titleMatchesGuess(correctTitle, trimmed);
  const matchedArtist = correctArtists.some((a) =>
    phraseMatchesTarget(a, trimmed),
  );

  return { matchedArtist, matchedTitle };
}

export interface TypingProgressScoreInput {
  artistCorrect: boolean;
  titleCorrect: boolean;
  artistCorrectAt: number | null;
  titleCorrectAt: number | null;
  bothCorrectAt: number | null;
}

export function scoreTypingProgress(
  progress: TypingProgressScoreInput,
  roundEndsAt: number,
  roundDurationMs: number,
): number {
  if (progress.bothCorrectAt !== null) {
    const timeRemaining = Math.max(0, roundEndsAt - progress.bothCorrectAt);
    return applyTypingTimeBonus(
      TYPING_BOTH_POINTS,
      timeRemaining,
      roundDurationMs,
    );
  }
  if (progress.artistCorrect && progress.artistCorrectAt !== null) {
    const timeRemaining = Math.max(0, roundEndsAt - progress.artistCorrectAt);
    return applyTypingTimeBonus(
      TYPING_ARTIST_POINTS,
      timeRemaining,
      roundDurationMs,
    );
  }
  if (progress.titleCorrect && progress.titleCorrectAt !== null) {
    const timeRemaining = Math.max(0, roundEndsAt - progress.titleCorrectAt);
    return applyTypingTimeBonus(
      TYPING_TITLE_POINTS,
      timeRemaining,
      roundDurationMs,
    );
  }
  return 0;
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

export interface TypingGuessResult {
  incorrect: boolean;
  matchedArtist: boolean;
  matchedTitle: boolean;
  artistCorrect: boolean;
  titleCorrect: boolean;
  bothCorrect: boolean;
}