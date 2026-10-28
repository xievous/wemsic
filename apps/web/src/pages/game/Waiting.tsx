import { Box, CircularProgress, Stack, Typography } from '@mui/material';
import { BouncingBars } from '../../components/BouncingBars';

/** Shown on player devices while the server resolves the next track. */
export function CueingUpSpinner() {
  return (
    <Stack alignItems="center" spacing={2} sx={{ py: 10 }}>
      <CircularProgress />
      <Typography color="text.secondary">Cueing up the next track...</Typography>
    </Stack>
  );
}

/** Big-screen equivalent of the spinner for the host presenter. */
export function PresenterWaitingStage() {
  return (
    <Box
      sx={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: '32px',
        p: { xs: 3.5, sm: 5 },
        color: '#fff',
        background: 'linear-gradient(135deg, #0E1A3C 0%, #1A2A6B 55%, #2A3F9E 100%)',
        boxShadow: '0 30px 60px -30px rgba(14,26,60,0.75)',
      }}
    >
      <Stack spacing={3} alignItems="center" sx={{ py: { xs: 2, sm: 3 } }}>
        <Typography variant="overline" sx={{ opacity: 0.75, letterSpacing: '0.12em' }}>
          Between rounds
        </Typography>
        <Typography
          variant="h4"
          sx={{
            fontFamily: '"Fredoka", sans-serif',
            fontWeight: 700,
            textAlign: 'center',
            color: '#fff',
          }}
        >
          Cueing up the next track…
        </Typography>
        <BouncingBars variant="stageLarge" justify="center" />
      </Stack>
    </Box>
  );
}
