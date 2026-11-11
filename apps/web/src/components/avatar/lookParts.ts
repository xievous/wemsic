import { AVATAR_FACE_COUNT, AVATAR_TOP_COUNT, type AvatarLook } from '@wemsic/shared';

/** Steps one part of the look, wrapping round at either end. */
export function stepPart(look: AvatarLook, part: 'face' | 'top', by: 1 | -1): AvatarLook {
  const count = part === 'face' ? AVATAR_FACE_COUNT : AVATAR_TOP_COUNT;
  return { ...look, [part]: (look[part] + by + count) % count };
}
