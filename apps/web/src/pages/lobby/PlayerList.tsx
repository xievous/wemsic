import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import { Box, Chip, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import type { Player } from '@wemsic/shared';
import { PlayerAvatar } from '../../components/PlayerAvatar';

/** Lobby roster with ready state; the host gets a remove button on everyone else. */
export function PlayerList({
  players,
  myPlayerId,
  isHost,
  hostMode,
  onKick,
}: {
  players: Player[];
  myPlayerId: string;
  isHost: boolean;
  hostMode: boolean;
  onKick: (playerId: string) => void;
}) {
  return (
    <>
      <Typography variant="h5" sx={{ mb: 1.5 }}>
        Players
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
          gap: 1.5,
          mb: 3,
        }}
      >
        {players.map((p) => {
          const ready = p.isReady;
          return (
            <Stack
              key={p.id}
              direction="row"
              spacing={1.5}
              alignItems="center"
              sx={{
                p: 1.75,
                borderRadius: '20px',
                bgcolor: 'background.paper',
                border: '2px solid',
                borderColor: ready ? 'success.main' : 'rgba(20,33,63,0.06)',
                boxShadow: '0 16px 36px -28px rgba(20,33,63,0.4)',
                transition: 'border-color 200ms ease',
              }}
            >
              <PlayerAvatar id={p.id} name={p.displayName} size={44} done={ready} />
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Stack direction="row" spacing={0.75} alignItems="center">
                  <Typography fontWeight={700} noWrap>
                    {p.displayName}
                    {p.id === myPlayerId && (
                      <Box component="span" sx={{ color: 'primary.main' }}> · you</Box>
                    )}
                  </Typography>
                  {p.isHost && (
                    <Chip
                      label={hostMode ? 'Host · screen' : 'Host'}
                      size="small"
                      sx={{ height: 20, bgcolor: 'rgba(58,107,255,0.12)', color: 'primary.main', fontWeight: 700 }}
                    />
                  )}
                </Stack>
              </Box>
              {isHost && p.id !== myPlayerId && (
                <Tooltip title={`Remove ${p.displayName}`}>
                  <IconButton
                    size="small"
                    aria-label={`Remove ${p.displayName}`}
                    onClick={() => onKick(p.id)}
                    sx={{
                      color: 'text.secondary',
                      '&:hover': { color: 'error.main', bgcolor: 'rgba(255,84,112,0.1)' },
                    }}
                  >
                    <CloseRoundedIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
            </Stack>
          );
        })}
      </Box>
    </>
  );
}
