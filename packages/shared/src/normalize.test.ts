import { describe, expect, it } from 'vitest';
import { normalizeAnswer, stripTitleQualifiers, titleMatchesGuess } from './normalize.js';

describe('normalizeAnswer', () => {
  it('drops accents, apostrophes and punctuation', () => {
    expect(normalizeAnswer("  Don't Stop Me Now!  ")).toBe('dont stop me now');
    expect(normalizeAnswer('Sigur Rós')).toBe('sigur ros');
    expect(normalizeAnswer('AC/DC')).toBe('ac dc');
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
  it('matches one-word titles exactly', () => {
    expect(titleMatchesGuess('Jump', 'jump')).toBe(true);
  });
});
