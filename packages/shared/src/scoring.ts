import {
  SPEED_CHOICE_MAX_POINTS,
  SPEED_CHOICE_MIN_POINTS,
  TYPING_ARTIST_POINTS,
  TYPING_BOTH_POINTS,
  TYPING_TITLE_POINTS,
} from './constants.js';
import type { TypingSpellingLeniency } from './game.js';
import {
  hardPhraseMatchesTarget,
  hardTitleMatchesGuess,
  lenientCombinedMatchesGuess,
  lenientPhraseMatchesTarget,
  lenientTitleMatchesGuess,
  normalizeAnswer,
  phraseMatchesTarget,
  removeNormalizedPhrase,
  stripTitleQualifiers,
  titleMatchesGuess,
} from './normalize.js';

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

function matchesArtist(
  artists: string[],
  guess: string,
  leniency: TypingSpellingLeniency,
): boolean {
  if (leniency === 'hard') {
    return artists.some((artist) => hardPhraseMatchesTarget(artist, guess));
  }
  if (leniency === 'lenient') {
    return artists.some((artist) => lenientPhraseMatchesTarget(artist, guess));
  }
  return artists.some((artist) => phraseMatchesTarget(artist, guess));
}

function matchesTitle(
  title: string,
  guess: string,
  leniency: TypingSpellingLeniency,
): boolean {
  if (leniency === 'hard') {
    return hardTitleMatchesGuess(title, guess);
  }
  if (leniency === 'lenient') {
    return lenientTitleMatchesGuess(title, guess);
  }
  return titleMatchesGuess(title, guess);
}

function evaluateNormalSubmission(
  correctArtists: string[],
  correctTitle: string,
  guess: string,
): TypingSubmissionMatch {
  let matchedTitle = matchesTitle(correctTitle, guess, 'normal');
  let matchedArtist = matchesArtist(correctArtists, guess, 'normal');

  if (!matchedTitle) {
    let withoutArtists = guess;
    for (const artist of correctArtists) {
      withoutArtists = removeNormalizedPhrase(withoutArtists, artist);
    }
    if (normalizeAnswer(withoutArtists) !== normalizeAnswer(guess)) {
      matchedTitle = matchesTitle(correctTitle, withoutArtists, 'normal');
    }
  }

  if (!matchedArtist) {
    const withoutTitle = removeNormalizedPhrase(
      guess,
      stripTitleQualifiers(correctTitle),
    );
    if (normalizeAnswer(withoutTitle) !== normalizeAnswer(guess)) {
      matchedArtist = matchesArtist(correctArtists, withoutTitle, 'normal');
    }
  }

  return { matchedArtist, matchedTitle };
}

/** Evaluate one submitted guess for typing mode. */
export function evaluateTypingSubmission(
  correctArtists: string[],
  correctTitle: string,
  guess: string,
  leniency: TypingSpellingLeniency = 'normal',
): TypingSubmissionMatch {
  const trimmed = guess.trim();
  if (!trimmed) {
    return { matchedArtist: false, matchedTitle: false };
  }

  if (leniency === 'normal') {
    return evaluateNormalSubmission(correctArtists, correctTitle, trimmed);
  }

  if (leniency === 'lenient') {
    if (lenientCombinedMatchesGuess(correctArtists, correctTitle, trimmed)) {
      return { matchedArtist: true, matchedTitle: true };
    }

    return {
      matchedArtist: matchesArtist(correctArtists, trimmed, 'lenient'),
      matchedTitle: matchesTitle(correctTitle, trimmed, 'lenient'),
    };
  }

  return {
    matchedArtist: matchesArtist(correctArtists, trimmed, 'hard'),
    matchedTitle: matchesTitle(correctTitle, trimmed, 'hard'),
  };
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
