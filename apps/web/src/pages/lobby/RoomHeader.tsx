import CastForEducationRoundedIcon from '@mui/icons-material/CastForEducationRounded';
import { Alert, Box, Chip, Stack, Typography } from '@mui/material';
import QRCode from 'react-qr-code';
import { CopyRoomCodeButton } from '../../components/CopyRoomCodeButton';

const bannerSx = {
  mb: 3,
  p: { xs: 2.5, sm: 3 },
  borderRadius: '24px',
  color: '#fff',
  background: 'linear-gradient(120deg, #3A6BFF 0%, #6C5CE7 55%, #00BFD8 100%)',
  boxShadow: '0 24px 50px -24px rgba(58,107,255,0.6)',
} as const;

function RoomCode({ code, compact = false }: { code: string; compact?: boolean }) {
  return (
    <Stack direction="row" alignItems="center" spacing={0.25}>
      <Typography
        variant="h2"
        sx={
          compact
            ? { letterSpacing: '0.18em', fontSize: { xs: '2rem', sm: '2.35rem' }, lineHeight: 1 }
            : { letterSpacing: '0.18em', fontSize: { xs: '2.4rem', sm: '3rem' } }
        }
      >
        {code}
      </Typography>
      <CopyRoomCodeButton code={code} />
    </Stack>
  );
}

/**
 * Gradient room-code banner. The host-mode shared screen also gets a QR code
 * so players can scan to join; online mode shows the connection status.
 */
export function RoomHeader({
  code,
  hostMode,
  isHost,
  connected,
}: {
  code: string;
  hostMode: boolean;
  isHost: boolean;
  connected: boolean;
}) {
  if (!hostMode) {
    return (
      <Box
        sx={{
          ...bannerSx,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 2,
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Box>
          <Typography variant="overline" sx={{ opacity: 0.85 }}>
            Room code
          </Typography>
          <RoomCode code={code} />
        </Box>
        <Chip
          label={connected ? 'Connected' : 'Connecting...'}
          sx={{
            bgcolor: 'rgba(255,255,255,0.2)',
            color: '#fff',
            fontWeight: 700,
            backdropFilter: 'blur(4px)',
          }}
        />
      </Box>
    );
  }

  if (!isHost) {
    return (
      <Box sx={{ ...bannerSx, overflow: 'hidden' }}>
        <Stack alignItems="center" spacing={0.75} sx={{ textAlign: 'center' }}>
          <Typography variant="overline" sx={{ opacity: 0.85 }}>
            Room code
          </Typography>
          <RoomCode code={code} compact />
        </Stack>
      </Box>
    );
  }

  const joinUrl = `${window.location.origin}/join/${code.toUpperCase()}`;
  return (
    <Box sx={{ ...bannerSx, overflow: 'hidden' }}>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
          alignItems: 'center',
          gap: { xs: 2.5, sm: 0 },
        }}
      >
        <Stack
          alignItems="center"
          spacing={0.75}
          sx={{
            textAlign: 'center',
            pb: { xs: 2.5, sm: 0 },
            borderBottom: { xs: '1px solid rgba(255,255,255,0.18)', sm: 'none' },
            borderRight: { sm: '1px solid rgba(255,255,255,0.18)' },
            pr: { sm: 3 },
          }}
        >
          <Typography variant="overline" sx={{ opacity: 0.85 }}>
            Room code
          </Typography>
          <RoomCode code={code} compact />
        </Stack>

        <Stack alignItems="center" spacing={1} sx={{ pl: { sm: 3 }, pt: { xs: 0.5, sm: 0 } }}>
          <Box
            sx={{
              lineHeight: 0,
              p: 1,
              borderRadius: '16px',
              bgcolor: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.18)',
              '& svg': {
                display: 'block',
                width: { xs: 110, sm: 120 },
                height: 'auto',
              },
            }}
          >
            <QRCode value={joinUrl} size={120} bgColor="transparent" fgColor="#FFFFFF" />
          </Box>
          <Typography
            variant="overline"
            sx={{ opacity: 0.85, fontSize: '0.62rem', letterSpacing: '0.14em' }}
          >
            Scan to join
          </Typography>
        </Stack>
      </Box>
    </Box>
  );
}

/** Explains the host-screen split to whichever side of it this device is. */
export function HostModeNotice({ isHost }: { isHost: boolean }) {
  return (
    <Alert
      severity="info"
      icon={<CastForEducationRoundedIcon />}
      sx={{
        mb: 2,
        bgcolor: 'rgba(58,107,255,0.08)',
        color: 'text.primary',
        '& .MuiAlert-icon': { color: 'primary.main' },
      }}
    >
      {isHost
        ? 'Host screen mode: this device is the shared screen. Keep it visible to everyone and turn on sound — it plays the music and shows each question and answers.'
        : 'Host screen mode: watch the host’s screen and listen there. Add a playlist if you like, then ready up — you’ll just tap your answers on this phone.'}
    </Alert>
  );
}
