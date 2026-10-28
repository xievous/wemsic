import GlobalStyles from '@mui/material/GlobalStyles';
import { keyframes } from '@mui/system';

/** Shared keyframe name for logo + stage equalizer bars. */
export const WEMSIC_BAR_BOUNCE = 'wemsic-bar-bounce';

/** Scale-in with a slight overshoot, used for reveal cards and scores. */
export const popIn = keyframes`
  0% { transform: scale(0.8); opacity: 0; }
  60% { transform: scale(1.05); }
  100% { transform: scale(1); opacity: 1; }
`;

export function AnimationStyles() {
  return (
    <GlobalStyles
      styles={{
        '@keyframes wemsic-bar-bounce': {
          '0%, 100%': { transform: 'scaleY(0.45)' },
          '50%': { transform: 'scaleY(1)' },
        },
      }}
    />
  );
}
