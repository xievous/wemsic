import GlobalStyles from '@mui/material/GlobalStyles';

/** Shared keyframe name for logo + stage equalizer bars. */
export const WEMSIC_BAR_BOUNCE = 'wemsic-bar-bounce';

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
