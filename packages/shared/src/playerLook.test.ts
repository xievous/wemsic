import { describe, expect, it } from 'vitest';
import { MAX_PLAYERS } from './constants.js';
import { AVATAR_COLOR_COUNT, pickColorIndex, pickInitials } from './playerLook.js';

describe('pickColorIndex', () => {
  it('takes the first free colour, reusing one freed by someone leaving', () => {
    expect(pickColorIndex([])).toBe(0);
    expect(pickColorIndex([0, 1, 2])).toBe(3);
    expect(pickColorIndex([0, 2])).toBe(1);
  });

  it('has a distinct colour for everyone in a full room', () => {
    const taken: number[] = [];
    for (let i = 0; i < MAX_PLAYERS; i += 1) taken.push(pickColorIndex(taken));
    expect(new Set(taken).size).toBe(MAX_PLAYERS);
    expect(AVATAR_COLOR_COUNT).toBeGreaterThanOrEqual(MAX_PLAYERS);
  });
});

describe('pickInitials', () => {
  it('uses first and last initials, or the first two letters', () => {
    expect(pickInitials('Oscar Lam', [])).toBe('OL');
    expect(pickInitials('Sam', [])).toBe('SA');
    expect(pickInitials('jo', [])).toBe('JO');
  });

  it('finds another pair when the first is taken', () => {
    expect(pickInitials('Sara', ['SA'])).toBe('SR');
    expect(pickInitials('Sarah', ['SA', 'SR'])).toBe('SH');
  });

  it('falls back to a number when every pair is taken', () => {
    expect(pickInitials('Al', ['AL', 'A'])).toBe('A2');
  });

  it('copes with one-letter names, emoji and empty names', () => {
    expect(pickInitials('Z', [])).toBe('Z');
    expect(pickInitials('Åsa', [])).toBe('ÅS');
    expect(pickInitials('🎵', [])).toBe('?');
    expect(pickInitials('🎵', ['?'])).toBe('?2');
  });

  it('is case-insensitive about what is taken', () => {
    expect(pickInitials('Sam', ['sa'])).toBe('SM');
  });
});
