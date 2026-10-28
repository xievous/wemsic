import { describe, expect, it } from 'vitest';
import {
  SPEED_CHOICE_MAX_POINTS,
  SPEED_CHOICE_MIN_POINTS,
  TYPING_ARTIST_POINTS,
  TYPING_BOTH_POINTS,
  TYPING_TITLE_POINTS,
} from './constants.js';
import type { TypingSpellingLeniency } from './game.js';
import {
  applyTypingTimeBonus,
  evaluateTypingSubmission,
  scoreSpeedChoice,
  scoreTypingProgress,
} from './scoring.js';

describe('scoreSpeedChoice', () => {
  it('gives nothing for a wrong answer', () => {
    expect(scoreSpeedChoice(false, 15_000, 15_000)).toBe(0);
  });

  it('scales with time remaining', () => {
    expect(scoreSpeedChoice(true, 15_000, 15_000)).toBe(SPEED_CHOICE_MAX_POINTS);
    expect(scoreSpeedChoice(true, 7_500, 15_000)).toBe(SPEED_CHOICE_MAX_POINTS / 2);
  });

  it('never drops below the minimum for a correct answer', () => {
    expect(scoreSpeedChoice(true, 0, 15_000)).toBe(SPEED_CHOICE_MIN_POINTS);
  });

  it('clamps time remaining outside the round', () => {
    expect(scoreSpeedChoice(true, 99_000, 15_000)).toBe(SPEED_CHOICE_MAX_POINTS);
    expect(scoreSpeedChoice(true, -5_000, 15_000)).toBe(SPEED_CHOICE_MIN_POINTS);
  });
});

describe('applyTypingTimeBonus', () => {
  it('pays full points at the start and half at the buzzer', () => {
    expect(applyTypingTimeBonus(1000, 30_000, 30_000)).toBe(1000);
    expect(applyTypingTimeBonus(1000, 0, 30_000)).toBe(500);
  });

  it('pays nothing for zero base points', () => {
    expect(applyTypingTimeBonus(0, 30_000, 30_000)).toBe(0);
  });
});

describe('scoreTypingProgress', () => {
  const roundEndsAt = 30_000;
  const duration = 30_000;
  const none = {
    artistCorrect: false,
    titleCorrect: false,
    artistCorrectAt: null,
    titleCorrectAt: null,
    bothCorrectAt: null,
  };

  it('scores nothing without a correct part', () => {
    expect(scoreTypingProgress(none, roundEndsAt, duration)).toBe(0);
  });

  it('scores artist-only and title-only from when they were found', () => {
    expect(
      scoreTypingProgress({ ...none, artistCorrect: true, artistCorrectAt: 0 }, roundEndsAt, duration),
    ).toBe(TYPING_ARTIST_POINTS);
    expect(
      scoreTypingProgress({ ...none, titleCorrect: true, titleCorrectAt: 0 }, roundEndsAt, duration),
    ).toBe(TYPING_TITLE_POINTS);
  });

  it('scores both from when the second part landed', () => {
    const both = {
      artistCorrect: true,
      titleCorrect: true,
      artistCorrectAt: 0,
      titleCorrectAt: 15_000,
      bothCorrectAt: 15_000,
    };
    expect(scoreTypingProgress(both, roundEndsAt, duration)).toBe(TYPING_BOTH_POINTS * 0.75);
  });
});

describe('evaluateTypingSubmission', () => {
  const artists = ['Daft Punk', 'Pharrell Williams'];
  const title = 'Get Lucky (feat. Pharrell Williams) - Radio Edit';

  const cases: Array<[TypingSpellingLeniency, string, boolean, boolean]> = [
    // leniency, guess, artist?, title?
    ['normal', 'daft punk', true, false],
    ['normal', 'Get Lucky', false, true],
    ['normal', 'daft punk get lucky', true, true],
    ['normal', 'get lucky daft punk', true, true],
    ['normal', 'pharrell williams', true, false],
    ['normal', 'daft pank', true, false],
    ['normal', 'get lucy', false, true],
    ['normal', 'lucky', false, false],
    ['normal', 'radio edit', false, false],
    ['normal', 'never gonna give you up', false, false],

    ['hard', 'Daft Punk', true, false],
    ['hard', 'get lucky', false, true],
    ['hard', 'daftpunk', false, false],
    ['hard', 'get lucy', false, false],

    ['lenient', 'daftpunk', true, false],
    ['lenient', 'get lukcy', false, true],
    ['lenient', 'daftpunkgetlucky', true, true],
    ['lenient', 'never gonna give you up', false, false],
  ];

  it.each(cases)('%s: "%s" → artist %s, title %s', (leniency, guess, artist, titleMatch) => {
    expect(evaluateTypingSubmission(artists, title, guess, leniency)).toEqual({
      matchedArtist: artist,
      matchedTitle: titleMatch,
    });
  });

  it('ignores accents', () => {
    expect(evaluateTypingSubmission(['Beyoncé'], 'Halo', 'beyonce')).toEqual({
      matchedArtist: true,
      matchedTitle: false,
    });
  });

  it('treats a blank guess as no match', () => {
    expect(evaluateTypingSubmission(artists, title, '   ')).toEqual({
      matchedArtist: false,
      matchedTitle: false,
    });
  });
});
