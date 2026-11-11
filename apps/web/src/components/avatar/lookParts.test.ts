import { AVATAR_FACE_COUNT, AVATAR_TOP_COUNT } from '@wemsic/shared';
import { describe, expect, it } from 'vitest';
import { stepPart } from './lookParts';

describe('stepPart', () => {
  const look = { color: 4, face: 0, top: 0 };

  it('moves one part and leaves the rest alone', () => {
    expect(stepPart(look, 'face', 1)).toEqual({ color: 4, face: 1, top: 0 });
    expect(stepPart(look, 'top', 1)).toEqual({ color: 4, face: 0, top: 1 });
  });

  it('wraps round at both ends', () => {
    expect(stepPart(look, 'face', -1).face).toBe(AVATAR_FACE_COUNT - 1);
    expect(stepPart({ ...look, top: AVATAR_TOP_COUNT - 1 }, 'top', 1).top).toBe(0);
  });
});
