import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import {
  Box,
  Button,
  ButtonBase,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Drawer,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import { COMPACT_ROSTER_AFTER, type Player } from '@wemsic/shared';
import { useState } from 'react';
import { PlayerAvatar } from '../../components/PlayerAvatar';

type RosterProps = {
  players: Player[];
  myPlayerId: string;
  isHost: boolean;
  onKick: (playerId: string) => void;
};


/**
 * Desktop: the players in a column beside the lobby, with ready and online
 * state. The host gets a remove button on everyone else (on hover, always on
 * touch), behind a confirmation so one mis-tap doesn't kick anyone.
 */
export function PlayerColumn({ players, myPlayerId, isHost, onKick }: RosterProps) {
  const [confirmKick, setConfirmKick] = useState<Player | null>(null);
  // A big room swaps the list for a two-column grid: avatar, name, ready tick.
  const compact = players.length > COMPACT_ROSTER_AFTER;
  const kickButton = (p: Player) =>
    isHost &&
    p.id !== myPlayerId && (
      <Tooltip title={`Remove ${p.displayName}`}>
        <IconButton
          className="kick"
          size="small"
          aria-label={`Remove ${p.displayName}`}
          onClick={() => setConfirmKick(p)}
          sx={{
            opacity: 0,
            transition: 'opacity 120ms ease',
            '@media (hover: none)': { opacity: 1 },
            color: 'text.secondary',
            '&:hover': { color: 'error.main', bgcolor: 'rgba(255,84,112,0.1)' },
          }}
        >
          <CloseRoundedIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    );

  return (
    <>
      <Card>
        <CardContent sx={{ p: 3 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ mb: 1.5 }}>
            <Typography variant="h5" sx={{ fontSize: '1.6rem' }}>
              Players
            </Typography>
            <Typography color="text.secondary" fontWeight={600}>
              {players.length} here
              {compact && ` · ${players.filter((p) => p.isReady).length} ready`}
            </Typography>
          </Stack>
          {players.length === 0 && (
            <Typography color="text.secondary">No one has joined yet. Share the code or the QR.</Typography>
          )}
          {compact ? (
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 0.75, mx: -1 }}>
              {players.map((p) => {
                const me = p.id === myPlayerId;
                return (
                  <Stack
                    key={p.id}
                    direction="row"
                    spacing={1.25}
                    alignItems="center"
                    sx={{
                      p: 0.875,
                      minWidth: 0,
                      borderRadius: '14px',
                      bgcolor: me ? 'rgba(58,107,255,0.08)' : 'transparent',
                      opacity: p.connected ? 1 : 0.55,
                      '&:hover': { bgcolor: 'rgba(58,107,255,0.06)' },
                      '&:hover .kick, & .kick:focus-visible': { opacity: 1 },
                    }}
                  >
                    <PlayerAvatar id={p.id} size={44} done={p.isReady} />
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography fontWeight={700} noWrap sx={{ fontSize: '1.02rem', lineHeight: 1.2 }}>
                        {me ? 'You' : p.displayName}
                      </Typography>
                      {p.isHost && (
                        <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: 'primary.main', lineHeight: 1.1 }}>
                          Host
                        </Typography>
                      )}
                    </Box>
                    {kickButton(p)}
                  </Stack>
                );
              })}
            </Box>
          ) : (
            <Stack spacing={0.5}>
              {players.map((p) => (
                <Stack
                  key={p.id}
                  direction="row"
                  spacing={1.5}
                  alignItems="center"
                  sx={{
                    p: 1,
                    mx: -1,
                    borderRadius: '16px',
                    opacity: p.connected ? 1 : 0.55,
                    '&:hover': { bgcolor: 'rgba(58,107,255,0.06)' },
                    '&:hover .kick, & .kick:focus-visible': { opacity: 1 },
                  }}
                >
                  <PlayerAvatar id={p.id} size={48} done={p.isReady} />
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <PlayerName player={p} me={p.id === myPlayerId} />
                    <PlayerStatus player={p} />
                  </Box>
                  {kickButton(p)}
                </Stack>
              ))}
            </Stack>
          )}
          {compact && (
            <Typography color="text.secondary" sx={{ mt: 1.5, fontSize: '0.9rem' }}>
              A tick means ready. Faded means offline.
            </Typography>
          )}
        </CardContent>
      </Card>
      <KickDialog player={confirmKick} onClose={() => setConfirmKick(null)} onKick={onKick} />
    </>
  );
}

/**
 * Phones: one row of avatars under the room code. Tapping one opens a sheet
 * with that player's status, and Remove for the host.
 */
export function PlayerStrip({ players, myPlayerId, isHost, onKick }: RosterProps) {
  const [open, setOpen] = useState<Player | null>(null);
  // Keep the sheet's content while it slides closed.
  const [shown, setShown] = useState<Player | null>(null);

  return (
    <>
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ overflowX: 'auto', pb: 0.5, mb: 3 }}>
        {players.map((p) => (
          <ButtonBase
            key={p.id}
            onClick={() => {
              setShown(p);
              setOpen(p);
            }}
            aria-label={`${p.displayName}${p.isReady ? ', ready' : ''}`}
            sx={{
              flexDirection: 'column',
              gap: 0.5,
              width: 64,
              flexShrink: 0,
              borderRadius: '14px',
              py: 0.5,
              opacity: p.connected ? 1 : 0.55,
            }}
          >
            <PlayerAvatar id={p.id} size={52} done={p.isReady} />
            <Typography variant="caption" fontWeight={600} noWrap sx={{ maxWidth: 64, color: 'text.secondary' }}>
              {p.id === myPlayerId ? 'You' : p.displayName}
            </Typography>
          </ButtonBase>
        ))}
        {players.length === 0 ? (
          <Typography color="text.secondary">No one has joined yet. Share the code.</Typography>
        ) : (
          <Typography color="text.secondary" fontWeight={600} sx={{ ml: 'auto !important', pl: 1, whiteSpace: 'nowrap' }}>
            {players.length} here
          </Typography>
        )}
      </Stack>

      <Drawer
        anchor="bottom"
        open={open !== null}
        onClose={() => setOpen(null)}
        PaperProps={{ sx: { borderRadius: '24px 24px 0 0', p: 3, pb: 4 } }}
      >
        {shown && (
          <Stack spacing={2.5}>
            <Stack direction="row" spacing={2} alignItems="center">
              <PlayerAvatar id={shown.id} size={56} done={shown.isReady} />
              <Box sx={{ minWidth: 0 }}>
                <PlayerName player={shown} me={shown.id === myPlayerId} />
                <PlayerStatus player={shown} />
              </Box>
            </Stack>
            <Stack direction="row" spacing={1.5}>
              <Button variant="outlined" fullWidth size="large" onClick={() => setOpen(null)}>
                Close
              </Button>
              {isHost && shown.id !== myPlayerId && (
                <Button
                  variant="contained"
                  color="error"
                  fullWidth
                  size="large"
                  onClick={() => {
                    onKick(shown.id);
                    setOpen(null);
                  }}
                >
                  Remove {shown.displayName}
                </Button>
              )}
            </Stack>
          </Stack>
        )}
      </Drawer>
    </>
  );
}

function PlayerName({ player, me }: { player: Player; me: boolean }) {
  return (
    <Stack direction="row" spacing={0.75} alignItems="center" sx={{ minWidth: 0 }}>
      <Typography fontWeight={700} noWrap sx={{ fontSize: '1.1rem' }}>
        {player.displayName}
        {me && (
          <Box component="span" sx={{ color: 'primary.main', fontWeight: 600 }}>
            {' '}
            · you
          </Box>
        )}
      </Typography>
      {player.isHost && (
        <Chip
          label="Host"
          size="small"
          sx={{ height: 22, bgcolor: 'rgba(58,107,255,0.12)', color: 'primary.main', fontWeight: 700 }}
        />
      )}
    </Stack>
  );
}

function KickDialog({
  player,
  onClose,
  onKick,
}: {
  player: Player | null;
  onClose: () => void;
  onKick: (playerId: string) => void;
}) {
  return (
    <Dialog open={player !== null} onClose={onClose} PaperProps={{ sx: { borderRadius: '20px' } }}>
      <DialogTitle>Remove {player?.displayName}?</DialogTitle>
      <DialogContent>
        <DialogContentText>Their playlists leave with them. They can rejoin with the room code.</DialogContentText>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button
          variant="contained"
          color="error"
          onClick={() => {
            if (player) onKick(player.id);
            onClose();
          }}
        >
          Remove
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/** "Ready · 42 songs", "Not ready · No songs yet", or offline. */
function PlayerStatus({ player }: { player: Player }) {
  if (!player.connected) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ display: 'block' }}>
        Offline · doesn't block the start
      </Typography>
    );
  }
  const songs =
    player.trackCount > 0
      ? `${player.trackCount} song${player.trackCount === 1 ? '' : 's'}`
      : 'No songs yet';
  return (
    <Typography variant="body2" color="text.secondary" sx={{ display: 'block' }}>
      <Box
        component="span"
        sx={{ color: player.isReady ? 'success.dark' : 'text.secondary', fontWeight: 700 }}
      >
        {player.isReady ? 'Ready' : 'Not ready'}
      </Box>
      {' · '}
      {songs}
    </Typography>
  );
}
