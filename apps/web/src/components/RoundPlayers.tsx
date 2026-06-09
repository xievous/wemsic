import { memo } from 'react';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import { Box, Stack, Typography } from '@mui/material';
import type { GameMode, RoundPlayerStatus } from '@wemsic/shared';
import { PlayerAvatar } from './PlayerAvatar';

function typingSecondary(p: RoundPlayerStatus): string {
  if (p.bothCorrect || (p.artistCorrect && p.titleCorrect)) return 'Nailed it';
  if (p.artistCorrect) return 'Got the artist';
  if (p.titleCorrect) return 'Got the song';
  return 'Still guessing';
}

function StatusPill({ on, label }: { on: boolean; label: string }) {
  return (
    <Box
      sx={{
        px: 1.2,
        py: 0.3,
        borderRadius: 999,
        fontSize: '0.68rem',
        fontWeight: 700,
        letterSpacing: '0.02em',
        color: on ? 'success.contrastText' : 'text.secondary',
        bgcolor: on ? 'success.main' : 'rgba(20,33,63,0.06)',
        transition: 'all 160ms ease',
      }}
    >
      {label}
    </Box>
  );
}

export const RoundPlayers = memo(function RoundPlayers({
  players,
  currentPlayerId,
  gameMode,
}: {
  players: RoundPlayerStatus[];
  currentPlayerId: string;
  gameMode?: GameMode;
}) {
  const isTyping = gameMode === 'typing';

  return (
    <Box
      sx={{
        bgcolor: 'background.paper',
        border: '1px solid rgba(20,33,63,0.06)',
        borderRadius: '24px',
        p: 2,
        boxShadow: '0 18px 40px -28px rgba(20,33,63,0.3)',
      }}
    >
      <Typography variant="overline" color="text.secondary" sx={{ px: 0.5 }}>
        In the room · {players.length}
      </Typography>
      <Stack spacing={1} sx={{ mt: 1 }}>
        {players.map((p) => {
          const done = isTyping ? p.bothCorrect : p.done;
          const isMe = p.playerId === currentPlayerId;
          return (
            <Stack
              key={p.playerId}
              direction="row"
              spacing={1.5}
              alignItems="center"
              sx={{
                p: 1,
                borderRadius: '16px',
                bgcolor: done ? 'rgba(22,199,154,0.12)' : isMe ? 'rgba(58,107,255,0.07)' : 'transparent',
                transition: 'background-color 200ms ease',
              }}
            >
              <PlayerAvatar id={p.playerId} name={p.displayName} size={36} done={done} />
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography
                  variant="body2"
                  fontWeight={700}
                  noWrap
                  sx={{ lineHeight: 1.1 }}
                >
                  {p.displayName}
                  {isMe && (
                    <Box component="span" sx={{ color: 'primary.main' }}> · you</Box>
                  )}
                </Typography>
                {!isTyping && (
                  <Typography variant="caption" color={done ? 'success.main' : 'text.secondary'}>
                    {done ? 'Locked in' : 'Choosing'}
                  </Typography>
                )}
                {isTyping && (
                  <Typography variant="caption" color={done ? 'success.main' : 'text.secondary'}>
                    {typingSecondary(p)}
                  </Typography>
                )}
              </Box>
              {isTyping ? (
                <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0 }}>
                  <StatusPill on={!!p.artistCorrect} label="Artist" />
                  <StatusPill on={!!p.titleCorrect} label="Song" />
                </Stack>
              ) : (
                done && <CheckRoundedIcon sx={{ color: 'success.main' }} />
              )}
            </Stack>
          );
        })}
      </Stack>
      {isTyping && (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ mt: 1.5, px: 0.5, display: 'block', lineHeight: 1.4 }}
        >
          The clock speeds up once someone lands both. Round ends when everyone has the full answer.
        </Typography>
      )}
    </Box>
  );
});
