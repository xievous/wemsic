import { Box } from '@mui/material';

export function RoundProgressBar({
  progress,
  low = false,
  size = 'default',
}: {
  progress: number;
  low?: boolean;
  size?: 'default' | 'large';
}) {
  const height = size === 'large' ? 12 : 10;

  return (
    <Box
      sx={{
        height,
        borderRadius: 999,
        bgcolor: 'rgba(255,255,255,0.18)',
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          height: '100%',
          width: `${progress}%`,
          borderRadius: 999,
          background: low
            ? 'linear-gradient(90deg, #FF7849, #FFB020)'
            : 'linear-gradient(90deg, #16C79A, #2DB7FF)',
          transition: 'width 100ms linear',
        }}
      />
    </Box>
  );
}
