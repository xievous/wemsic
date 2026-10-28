import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import { Alert, Button } from '@mui/material';
import { useEffect, useState } from 'react';

/**
 * Start countdown notice for everyone, plus the host's start / cancel button.
 * The server owns the countdown; this only ticks down to its end time.
 */
export function StartControls({
  startCountdownEndsAt,
  isHost,
  canStart,
  roomHasPlaylist,
  onStart,
}: {
  startCountdownEndsAt?: number | null;
  isHost: boolean;
  canStart: boolean;
  roomHasPlaylist: boolean;
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
          sx={{ py: 2, fontSize: '1.15rem' }}
        >
          {countdownActive
            ? `Starting in ${countdownLeft}… (tap to cancel)`
            : roomHasPlaylist
              ? 'Start the game'
              : 'Add a playlist to start'}
        </Button>
      )}
    </>
  );
}
