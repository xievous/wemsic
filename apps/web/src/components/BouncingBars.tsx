import { Box, Stack } from '@mui/material';
import { WEMSIC_BAR_BOUNCE } from '../styles/animations';

type BarConfig = {
  color: string;
  delay: number;
  duration: number;
};

export type BouncingBarsVariant = 'wordmark' | 'stage' | 'stageLarge';

const VARIANTS: Record<
  BouncingBarsVariant,
  { barHeight: number; barWidth: number; gap: number; bars: BarConfig[] }
> = {
  wordmark: {
    barHeight: 22,
    barWidth: 5,
    gap: 0.4,
    bars: [
      { color: '#3A6BFF', delay: 0, duration: 1.1 },
      { color: '#00BFD8', delay: 0.2, duration: 1.15 },
      { color: '#16C79A', delay: 0.4, duration: 1.05 },
      { color: '#6C5CE7', delay: 0.6, duration: 1.2 },
    ],
  },
  stage: {
    barHeight: 40,
    barWidth: 6,
    gap: 0.6,
    bars: [
      { color: 'rgba(255,255,255,0.92)', delay: 0, duration: 0.85 },
      { color: 'rgba(255,255,255,0.92)', delay: 0.12, duration: 0.95 },
      { color: 'rgba(255,255,255,0.92)', delay: 0.24, duration: 0.8 },
      { color: 'rgba(255,255,255,0.92)', delay: 0.08, duration: 1.0 },
      { color: 'rgba(255,255,255,0.92)', delay: 0.18, duration: 0.9 },
      { color: 'rgba(255,255,255,0.92)', delay: 0.3, duration: 0.88 },
    ],
  },
  stageLarge: {
    barHeight: 56,
    barWidth: 8,
    gap: 0.85,
    bars: [
      { color: 'rgba(255,255,255,0.92)', delay: 0, duration: 0.85 },
      { color: 'rgba(255,255,255,0.92)', delay: 0.07, duration: 0.95 },
      { color: 'rgba(255,255,255,0.92)', delay: 0.14, duration: 0.8 },
      { color: 'rgba(255,255,255,0.92)', delay: 0.21, duration: 1.0 },
      { color: 'rgba(255,255,255,0.92)', delay: 0.1, duration: 0.9 },
      { color: 'rgba(255,255,255,0.92)', delay: 0.18, duration: 0.88 },
      { color: 'rgba(255,255,255,0.92)', delay: 0.25, duration: 0.92 },
      { color: 'rgba(255,255,255,0.92)', delay: 0.05, duration: 0.98 },
    ],
  },
};

export function BouncingBars({
  variant,
  justify = 'flex-start',
}: {
  variant: BouncingBarsVariant;
  justify?: 'flex-start' | 'center';
}) {
  const cfg = VARIANTS[variant];

  return (
    <Stack
      direction="row"
      spacing={cfg.gap}
      alignItems="flex-end"
      justifyContent={justify}
      sx={{ height: cfg.barHeight }}
      aria-hidden
    >
      {cfg.bars.map((bar, i) => (
        <Box
          key={i}
          sx={{
            width: cfg.barWidth,
            height: cfg.barHeight,
            borderRadius: 999,
            transformOrigin: 'bottom',
            bgcolor: bar.color,
            animation: `${WEMSIC_BAR_BOUNCE} ${bar.duration}s ease-in-out infinite`,
            animationDelay: `${bar.delay}s`,
            '@media (prefers-reduced-motion: reduce)': {
              animationDuration: `${bar.duration * 2}s`,
            },
          }}
        />
      ))}
    </Stack>
  );
}
