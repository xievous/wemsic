import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import { Alert, Button, Typography } from '@mui/material';
import { useEffect, useState } from 'react';

/**
 * Start countdown notice for everyone, plus the host's start / cancel button.
 * Everyone else sees what the room is waiting for. The server owns the
 * countdown; this only ticks down to its end time.
 */
export function StartControls({
  startCountdownEndsAt,
  isHost,
  canStart,
  blocker,
  onStart,
}: {
  startCountdownEndsAt?: number | null;
  isHost: boolean;
  canStart: boolean;
  /** Why the game can't start yet (see startBlocker), or null. */
  blocker: string | null;
  onStart: () => void;
}) {
  const [countdownLeft, setCountdownLeft] = useState<number | null>(null);

  useEffect(() => {
    const endsAt = startCountdownEndsAt;
    if (!endsAt) {
      setCountdownLeft(null);
      return;
    }
    const tick = () => {
      setCountdownLeft(Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)));
    };
    tick();
    const id = setInterval(tick, 200);
    return () => clearInterval(id);
  }, [startCountdownEndsAt]);

  const countdownActive = countdownLeft !== null && countdownLeft > 0;

  return (
    <>
      {countdownActive && (
        <Alert
          severity="info"
          sx={{
            mb: 2,
            bgcolor: 'rgba(58,107,255,0.08)',
            color: 'text.primary',
            '& .MuiAlert-icon': { color: 'primary.main' },
          }}
        >
          {isHost
            ? `Game starts in ${countdownLeft} second${countdownLeft === 1 ? '' : 's'}. Tap the button again to cancel.`
            : `The host is starting the game in ${countdownLeft}…`}
        </Alert>
      )}

      {isHost && (
        <Button
          variant="contained"
          size="large"
          fullWidth
          color="primary"
          startIcon={countdownActive ? <CloseRoundedIcon /> : <PlayArrowRoundedIcon />}
          disabled={!canStart && !countdownActive}
          onClick={onStart}
          sx={{
            py: 2,
            fontSize: '1.15rem',
            // On phones the button is below a long page; keep it in reach.
            position: { xs: 'sticky', sm: 'static' },
            bottom: { xs: 16 },
            zIndex: 5,
            // Solid, so the page doesn't show through while it's disabled and stuck.
            '&.Mui-disabled': { bgcolor: '#DCE3F0' },
          }}
        >
          {countdownActive
            ? `Starting in ${countdownLeft}… (tap to cancel)`
            : (blocker ?? 'Start the game')}
        </Button>
      )}

      {!isHost && !countdownActive && (
        <Typography color="text.secondary" sx={{ textAlign: 'center', fontWeight: 600 }}>
          {blocker ?? 'Everyone’s ready. Waiting for the host to start.'}
        </Typography>
      )}
    </>
  );
}
