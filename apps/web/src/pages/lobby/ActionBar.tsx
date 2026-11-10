import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import VolumeUpRoundedIcon from '@mui/icons-material/VolumeUpRounded';
import { Box, Button, Typography } from '@mui/material';
import type { LobbyState } from '@wemsic/shared';
import { useEffect, useState } from 'react';
import { useAudio } from '../../audio/AudioProvider';
import { lobbyAction, type LobbyActionKind } from './lobbyAction';

const ICONS: Record<LobbyActionKind, React.ReactNode> = {
  start: <PlayArrowRoundedIcon />,
  cancel: <CloseRoundedIcon />,
  ready: <CheckRoundedIcon />,
  unready: <CheckRoundedIcon />,
  sound: <VolumeUpRoundedIcon />,
};

/** Seconds left on the server's start countdown, ticking locally; null when none. */
function useCountdown(endsAt: number | null | undefined): number | null {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    if (!endsAt) {
      setLeft(null);
      return;
    }
    const tick = () => setLeft(Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 200);
    return () => clearInterval(id);
  }, [endsAt]);
  return left;
}

/**
 * The lobby's bottom bar, stuck to the bottom of the screen: what the room is
 * waiting for, Leave, and this device's one main action (Start for the host,
 * I'm ready for players). Ready and Start also unlock sound, since a tap is
 * the gesture browsers want before audio plays.
 */
export function ActionBar({
  lobby,
  myPlayerId,
  onReadyChange,
  onStart,
  onLeave,
}: {
  lobby: LobbyState;
  myPlayerId: string;
  onReadyChange: (ready: boolean) => void;
  onStart: () => void;
  onLeave: () => void;
}) {
  const { enabled: soundOn, enableAudio } = useAudio();
  const countdownLeft = useCountdown(lobby.startCountdownEndsAt);
  const action = lobbyAction(lobby, myPlayerId, { soundOn, countdownLeft });

  function handleMain() {
    if (action.enablesSound) enableAudio();
    switch (action.kind) {
      case 'start':
        // The server handles these in order, so the host is ready before the start.
        if (action.readiesFirst) onReadyChange(true);
        onStart();
        break;
      case 'cancel':
        onStart();
        break;
      case 'ready':
        onReadyChange(true);
        break;
      case 'unready':
        onReadyChange(false);
        break;
      case 'sound':
        break;
    }
  }

  const counting = action.kind === 'cancel';

  return (
    <Box
      sx={{
        position: 'sticky',
        bottom: { xs: 12, sm: 16 },
        zIndex: 5,
        mt: 1,
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        alignItems: { xs: 'stretch', sm: 'center' },
        gap: { xs: 1.25, sm: 2 },
        p: { xs: 1.5, sm: 1.5 },
        pl: { sm: 3 },
        borderRadius: { xs: '24px', sm: 999 },
        bgcolor: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(20,33,63,0.08)',
        boxShadow: '0 18px 40px -20px rgba(20,33,63,0.35)',
      }}
    >
      <Typography
        role="status"
        sx={{
          flex: 1,
          minWidth: 0,
          fontWeight: 600,
          fontSize: '1.05rem',
          color: 'text.secondary',
          textAlign: { xs: 'center', sm: 'left' },
        }}
      >
        {action.status}
      </Typography>
      <Box sx={{ display: 'flex', gap: 1.25 }}>
        <Button
          variant="contained"
          color="error"
          size="large"
          onClick={onLeave}
          sx={{ borderRadius: 999, px: { xs: 2.5, sm: 3.5 }, py: 1.75, fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}
        >
          Leave
        </Button>
        <Button
          variant={action.kind === 'unready' ? 'outlined' : 'contained'}
          color={action.kind === 'unready' ? 'success' : counting ? 'warning' : 'primary'}
          size="large"
          startIcon={ICONS[action.kind]}
          disabled={action.disabled}
          onClick={handleMain}
          sx={{
            flex: { xs: 1, sm: 'none' },
            minWidth: { sm: 240 },
            borderRadius: 999,
            px: { xs: 2, sm: 4 },
            py: 1.75,
            fontSize: '1.15rem',
            fontWeight: 700,
            whiteSpace: 'nowrap',
            '&.Mui-disabled': { bgcolor: '#DCE3F0', color: 'text.secondary' },
          }}
        >
          {action.label}
        </Button>
      </Box>
    </Box>
  );
}
