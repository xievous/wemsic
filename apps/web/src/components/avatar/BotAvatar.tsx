import type { AvatarLook } from '@wemsic/shared';
import type { ReactNode } from 'react';
import { EKO_CYAN as CYAN, EKO_INK as INK, heartPath, starPath } from '../eko/Eko';
import { AVATAR_COLORS } from '../../theme';

function Stroke({ d }: { d: string }) {
  return <path d={d} stroke={CYAN} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />;
}

/**
 * Eko's own visor faces, still (dozens can be on screen at once), drawn at
 * Eko's coordinates: eyes centred at (90, 87) and (110, 87). Order matters,
 * it's what AvatarLook.face points at.
 */
const FACES: ReactNode[] = [
  // happy
  <>
    <Stroke d="M85 90 L90 84 L95 90" />
    <Stroke d="M105 90 L110 84 L115 90" />
  </>,
  // neutral
  <>
    <rect x="86.5" y="82" width="7" height="10" rx="3.5" fill={CYAN} />
    <rect x="106.5" y="82" width="7" height="10" rx="3.5" fill={CYAN} />
  </>,
  // starry
  <>
    <path d={starPath(90, 87, 6.5)} fill="#FFB020" />
    <path d={starPath(110, 87, 6.5)} fill="#FFB020" />
  </>,
  // love
  <>
    <path d={heartPath(90, 87)} fill="#FF6B9A" />
    <path d={heartPath(110, 87)} fill="#FF6B9A" />
  </>,
  // whoa
  <>
    <circle cx="90" cy="87" r="4.6" stroke={CYAN} strokeWidth="2.6" fill="none" />
    <circle cx="110" cy="87" r="4.6" stroke={CYAN} strokeWidth="2.6" fill="none" />
  </>,
  // focused
  <>
    <rect x="85" y="86" width="10" height="3.2" rx="1.6" fill={CYAN} />
    <rect x="105" y="86" width="10" height="3.2" rx="1.6" fill={CYAN} />
  </>,
  // sleepy
  <>
    <Stroke d="M85 86 Q90 91 95 86" />
    <Stroke d="M105 86 Q110 91 115 86" />
  </>,
  // oops
  <>
    <Stroke d="M86 83 L94 87 L86 91" />
    <Stroke d="M114 83 L106 87 L114 91" />
  </>,
  // wink
  <>
    <Stroke d="M85 90 L90 84 L95 90" />
    <rect x="106.5" y="86" width="8" height="3" rx="1.5" fill={CYAN} />
  </>,
];

/** What sits on top of the head (its top edge is at y 34 of the 100 box). Order matters too. */
const TOPS: ReactNode[] = [
  // nothing
  null,
  // antenna
  <>
    <line x1="50" y1="34" x2="50" y2="14" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
    <circle cx="50" cy="11" r="7" fill="#FFB020" />
  </>,
  // headphones
  <>
    <path d="M14 54 Q14 12 50 12 Q86 12 86 54" stroke={INK} strokeWidth="6" fill="none" />
    <rect x="5" y="46" width="15" height="26" rx="7" fill="#FF5470" />
    <rect x="80" y="46" width="15" height="26" rx="7" fill="#FF5470" />
  </>,
  // cap
  <>
    <path d="M22 37 Q24 13 50 13 Q76 13 78 37 Z" fill="#FF5470" />
    <rect x="50" y="31" width="40" height="8" rx="4" fill="#E0405C" />
    <circle cx="50" cy="13" r="3.5" fill="#E0405C" />
  </>,
  // crown
  <>
    <path
      d="M28 38 L26 14 L39 26 L50 8 L61 26 L74 14 L72 38 Z"
      fill="#FFB020"
      stroke="#E09000"
      strokeWidth="2"
      strokeLinejoin="round"
    />
    <circle cx="50" cy="24" r="3.5" fill="#FF5C9E" />
  </>,
  // party hat
  <>
    <path d="M34 38 L50 4 L66 38 Z" fill="#7C4DFF" />
    <path d="M40 26 L60 26 M44 16 L56 16" stroke="#FFB020" strokeWidth="4" />
    <circle cx="50" cy="5" r="5.5" fill="#FF5C9E" />
  </>,
  // bow
  <>
    <path d="M50 30 L32 18 Q26 30 32 42 Z" fill="#FF5C9E" />
    <path d="M50 30 L68 18 Q74 30 68 42 Z" fill="#FF5C9E" />
    <circle cx="50" cy="30" r="6" fill="#E0407F" />
  </>,
  // sprout
  <>
    <path d="M50 36 Q48 24 50 14" stroke="#0E9F78" strokeWidth="3.5" fill="none" strokeLinecap="round" />
    <path d="M50 22 Q36 10 28 18 Q38 30 50 22 Z" fill="#16C79A" />
    <path d="M50 18 Q62 4 72 12 Q62 24 50 18 Z" fill="#16C79A" />
  </>,
];

/** The colour a look's head is painted in. */
export function lookColor(look: AvatarLook): string {
  return AVATAR_COLORS[look.color % AVATAR_COLORS.length].bg;
}

/**
 * A player's mini Eko: a head in their colour, Eko's ink visor with one of
 * its faces, and a top piece. Fills its box; decorative, since the player's
 * name always sits next to it.
 */
export function BotAvatar({ look }: { look: AvatarLook }) {
  const body = lookColor(look);
  // The ink head would swallow its own ink visor and ears, so those get a lighter edge.
  const onInk = body === INK;
  const ear = onInk ? '#3A4A70' : INK;
  return (
    <svg viewBox="0 0 100 100" width="100%" height="100%" aria-hidden="true" focusable="false" style={{ display: 'block', overflow: 'visible' }}>
      <rect x="8" y="54" width="10" height="16" rx="4" fill={ear} />
      <rect x="82" y="54" width="10" height="16" rx="4" fill={ear} />
      <rect
        x="14"
        y="34"
        width="72"
        height="62"
        rx="22"
        fill={body}
        stroke={onInk ? '#3A4A70' : 'none'}
        strokeWidth={onInk ? 2 : 0}
      />
      <rect
        x="21"
        y="48"
        width="58"
        height="30"
        rx="15"
        fill={INK}
        stroke={onInk ? '#5B6B8C' : 'rgba(255,255,255,0.55)'}
        strokeWidth="2.5"
      />
      <g transform="translate(50 63) scale(1.35) translate(-100 -87)">{FACES[look.face % FACES.length]}</g>
      {TOPS[look.top % TOPS.length]}
    </svg>
  );
}
