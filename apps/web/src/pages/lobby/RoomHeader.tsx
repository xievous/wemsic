import CastForEducationRoundedIcon from '@mui/icons-material/CastForEducationRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import IosShareRoundedIcon from '@mui/icons-material/IosShareRounded';
import { Alert, Box, Button, Card, CardContent, Typography } from '@mui/material';
import { useState } from 'react';
import QRCode from 'react-qr-code';
import { Eko } from '../../components/eko/Eko';
import { copyText, joinUrlFor, shareJoinLink } from '../../components/inviteLink';
import { INK } from '../../theme';
import { LOBBY_SIDE_WIDTH } from './layout';

/** Hidden on screen, still read out by screen readers. */
const visuallyHidden = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
} as const;

/**
 * A button that confirms it worked without changing its text, so it never
 * changes size: it turns green with a tick for two seconds. Screen readers
 * hear `doneLabel` through a hidden status message.
 */
function FlashButton({
  label,
  doneLabel,
  icon,
  onClick,
}: {
  label: string;
  doneLabel: string;
  icon: React.ReactNode;
  onClick: () => Promise<'shared' | 'copied' | 'failed'>;
}) {
  const [done, setDone] = useState(false);
  return (
    <Button
      variant="contained"
      size="large"
      color={done ? 'success' : 'primary'}
      startIcon={done ? <CheckCircleRoundedIcon /> : icon}
      onClick={async () => {
        if ((await onClick()) !== 'copied') return;
        setDone(true);
        window.setTimeout(() => setDone(false), 2000);
      }}
      sx={{ py: 1.75, fontSize: '1.1rem', fontWeight: 700, minWidth: 0 }}
    >
      {label}
      <Box component="span" role="status" sx={visuallyHidden}>
        {done ? doneLabel : ''}
      </Box>
    </Button>
  );
}

/**
 * Eko and the room code, big enough to read from across the room (the lobby
 * is often on a TV), with Copy and Invite in a block as wide as the players
 * column below it.
 */
export function RoomHeader({ code }: { code: string }) {
  return (
    <Box
      component="header"
      sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: { xs: 2, md: 3 }, mb: 3 }}
    >
      <Box sx={{ width: { xs: 72, md: 112 }, flexShrink: 0, my: -1 }}>
        <Eko face="happy" move="bob" />
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="overline" color="text.secondary" sx={{ fontSize: '0.85rem' }}>
          Room code
        </Typography>
        <Typography
          component="p"
          sx={{
            fontFamily: '"Fredoka", sans-serif',
            fontWeight: 700,
            fontSize: { xs: '2.8rem', md: '5rem' },
            letterSpacing: '0.14em',
            lineHeight: 1,
          }}
        >
          {code.toUpperCase()}
        </Typography>
      </Box>
      <Box
        sx={{
          ml: { md: 'auto' },
          width: { xs: '100%', md: LOBBY_SIDE_WIDTH },
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
          gap: 1.5,
        }}
      >
        <FlashButton
          label="Copy"
          doneLabel="Copied"
          icon={<ContentCopyRoundedIcon />}
          onClick={() => copyText(code.toUpperCase())}
        />
        <FlashButton
          label="Invite"
          doneLabel="Link copied"
          icon={<IosShareRoundedIcon />}
          onClick={() => shareJoinLink(code)}
        />
      </Box>
    </Box>
  );
}

/**
 * Host-screen mode: a big QR on the shared screen, so players can scan it
 * from where they sit (the 10-foot rule). It fills the players column.
 */
export function JoinQrCard({ code }: { code: string }) {
  return (
    <Card sx={{ mb: 3 }}>
      <CardContent sx={{ p: 3, '&:last-child': { pb: 3 }, textAlign: 'center' }}>
        <Typography variant="h5" sx={{ fontSize: '1.6rem', mb: 2 }}>
          Scan to join
        </Typography>
        <Box
          sx={{
            lineHeight: 0,
            mx: 'auto',
            width: '100%',
            maxWidth: 300,
            '& svg': { width: '100%', height: 'auto', display: 'block' },
          }}
        >
          <QRCode value={joinUrlFor(code)} size={300} bgColor="transparent" fgColor={INK} />
        </Box>
      </CardContent>
    </Card>
  );
}

/** Explains the host-screen split to whichever side of it this device is; closable once read. */
export function HostModeNotice({ isHost, onClose }: { isHost: boolean; onClose: () => void }) {
  return (
    <Alert
      severity="info"
      icon={<CastForEducationRoundedIcon />}
      onClose={onClose}
      sx={{
        mb: 3,
        bgcolor: 'rgba(58,107,255,0.08)',
        color: 'text.primary',
        '& .MuiAlert-icon': { color: 'primary.main' },
      }}
    >
      {isHost
        ? 'Host screen mode: this device is the shared screen. Keep it visible to everyone. It plays the music and shows each question and answers.'
        : 'Host screen mode: watch the host’s screen and listen there. Add a playlist if you like, then ready up. You’ll just tap your answers on this phone.'}
    </Alert>
  );
}
