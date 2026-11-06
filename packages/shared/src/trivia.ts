import type { TriviaKind, TypingSpellingLeniency } from './game.js';
import { normalizeAnswer, stripTitleQualifiers } from './normalize.js';
import { matchesArtist, matchesTitle } from './scoring.js';

/** The question each trivia round asks, as shown on screen. */
export const TRIVIA_QUESTIONS: Record<TriviaKind, string> = {
  title: "What's this song called?",
  artist: 'Who is the artist?',
  album: 'Which album is this song from?',
  year: 'What year did this song come out?',
  added_by: 'Who added this song?',
};

/** Placeholder for the typing box on each trivia question. */
export const TRIVIA_PLACEHOLDERS: Record<TriviaKind, string> = {
  title: 'The song name',
  artist: 'The artist',
  album: 'The album name',
  year: 'A year, like 1997',
  added_by: "A player's name",
};

/** "Who added this song?" needs at least this many people with songs in the game. */
export const TRIVIA_MIN_CONTRIBUTORS = 3;

/** Typing a year that's off by 0, 1 or 2 earns this share of the points. */
const YEAR_CREDIT = [1, 0.5, 0.25];

/** A typed year, or null when the guess isn't one. */
export function parseYearGuess(guess: string): number | null {
  const match = guess.trim().match(/^'?(\d{4})$/);
  return match ? Number(match[1]) : null;
}

/** Share of the points a year guess earns: exact, one year off, two years off. */
export function yearGuessCredit(answer: number, guess: number): number {
  return YEAR_CREDIT[Math.abs(answer - guess)] ?? 0;
}

/** Album titles without "(Deluxe Edition)", "- Remastered 2011", "+ Bonus Video" and the like. */
export function cleanAlbumTitle(album: string): string {
  return stripTitleQualifiers(album.replace(/\s\+\s.*$/, '').replace(/[‘’]/g, "'"));
}

/** Whether a typed guess names the answer to a title, artist or album question. */
export function triviaTextMatches(
  kind: 'title' | 'artist' | 'album',
  answer: { title: string; artists: string[]; album: string | null },
  guess: string,
  leniency: TypingSpellingLeniency,
): boolean {
  if (kind === 'artist') return matchesArtist(answer.artists, guess, leniency);
  if (kind === 'album') return !!answer.album && matchesTitle(answer.album, guess, leniency);
  return matchesTitle(answer.title, guess, leniency);
}

/** The player a typed name points to, ignoring case, accents and spacing. */
export function matchPlayerName<T extends { displayName: string }>(
  players: T[],
  guess: string,
): T | null {
  const want = normalizeAnswer(guess);
  if (!want) return null;
  return players.find((p) => normalizeAnswer(p.displayName) === want) ?? null;
}
