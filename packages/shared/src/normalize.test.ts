import { describe, expect, it } from 'vitest';
import {
  normalizeAnswer,
  normalizeHard,
  normalizeLenient,
  stripTitleQualifiers,
  titleMatchesGuess,
} from './normalize.js';

describe('normalizers', () => {
  it('normalizeAnswer drops accents, apostrophes and punctuation', () => {
    expect(normalizeAnswer("  Don't Stop Me Now!  ")).toBe('dont stop me now');
    expect(normalizeAnswer('Sigur Rós')).toBe('sigur ros');
    expect(normalizeAnswer('AC/DC')).toBe('ac dc');
  });

  it('normalizeHard keeps spaces and punctuation', () => {
    expect(normalizeHard(' AC/DC ')).toBe('ac/dc');
  });

  it('normalizeLenient keeps only letters and digits', () => {
    expect(normalizeLenient('AC/DC - Back In Black')).toBe('acdcbackinblack');
  });
});

describe('stripTitleQualifiers', () => {
  it.each([
    ['Changes - 2013 Remaster', 'Changes'],
    ['Would? (2022 Remaster)', 'Would?'],
    ['Song [Live] (Acoustic) - Radio Edit', 'Song'],
    ['Plain Title', 'Plain Title'],
  ])('"%s" → "%s"', (input, expected) => {
    expect(stripTitleQualifiers(input)).toBe(expected);
  });
});

describe('titleMatchesGuess', () => {
  it('needs the whole core title, not one word of it', () => {
    expect(titleMatchesGuess('Bohemian Rhapsody - Remastered 2011', 'bohemian rhapsody')).toBe(true);
    expect(titleMatchesGuess('Bohemian Rhapsody - Remastered 2011', 'rhapsody')).toBe(false);
  });

  it('rejects guesses that only name the version suffix', () => {
    expect(titleMatchesGuess('Bohemian Rhapsody - Remastered 2011', 'remastered')).toBe(false);
  });

  it('matches one-word titles exactly', () => {
    expect(titleMatchesGuess('Jump', 'jump')).toBe(true);
  });
});
