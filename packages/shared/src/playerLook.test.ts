import { describe, expect, it } from 'vitest';
import {
  AVATAR_COLOR_COUNT,
  AVATAR_FACE_COUNT,
  AVATAR_TOP_COUNT,
  lookFromSeed,
  randomLook,
  sanitizeLook,
} from './playerLook.js';

describe('randomLook', () => {
  it('stays inside every part, even at the edges of the random range', () => {
    expect(randomLook(() => 0)).toEqual({ color: 0, face: 0, top: 0 });
    expect(randomLook(() => 0.999999)).toEqual({
      color: AVATAR_COLOR_COUNT - 1,
      face: AVATAR_FACE_COUNT - 1,
      top: AVATAR_TOP_COUNT - 1,
    });
    expect(randomLook(() => 1)).toEqual(randomLook(() => 0.999999));
  });
});

describe('lookFromSeed', () => {
  it('is stable and always a real look', () => {
    for (const id of ['a', 'player-1', 'x7Kq9_zz', '']) {
      expect(lookFromSeed(id)).toEqual(lookFromSeed(id));
      expect(sanitizeLook(lookFromSeed(id))).toEqual(lookFromSeed(id));
    }
  });
});

describe('sanitizeLook', () => {
  it('keeps a real look', () => {
    expect(sanitizeLook({ color: 8, face: 2, top: 7 })).toEqual({ color: 8, face: 2, top: 7 });
  });

  it('turns anything else into null', () => {
    expect(sanitizeLook(undefined)).toBeNull();
    expect(sanitizeLook('blue')).toBeNull();
    expect(sanitizeLook({ color: 9, face: 0, top: 0 })).toBeNull();
    expect(sanitizeLook({ color: 0, face: -1, top: 0 })).toBeNull();
    expect(sanitizeLook({ color: 0, face: 1.5, top: 0 })).toBeNull();
    expect(sanitizeLook({ color: '0', face: 0, top: 0 })).toBeNull();
    expect(sanitizeLook({ color: 0, face: 0 })).toBeNull();
  });

  it('drops extra fields', () => {
    expect(sanitizeLook({ color: 1, face: 1, top: 1, evil: '<script>' })).toEqual({ color: 1, face: 1, top: 1 });
  });
});
