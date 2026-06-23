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
  showOthersGuesses = false,
}: {
  players: RoundPlayerStatus[];
  currentPlayerId: string;
  gameMode?: GameMode;
  showOthersGuesses?: boolean;
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
          const isMe = p.playerId === currentPlayerId;
          const showWrongGuess = showOthersGuesses && isTyping && !!p.guessText;
          const showGuessedRight = showOthersGuesses && isTyping && !!p.guessedRight;
          const showOwnTypingProgress = isTyping && !showOthersGuesses && isMe;
          const done = isTyping
            ? showOthersGuesses
              ? !!(p.done || p.guessedRight)
              : isMe
                ? p.bothCorrect
                : false
            : p.done;

          let secondary: string;
          if (showWrongGuess) {
            secondary = p.guessText!;
          } else if (showGuessedRight) {
            secondary = 'Guessed right';
          } else if (isTyping) {
            secondary = showOwnTypingProgress ? typingSecondary(p) : 'Guessing';
          } else if (showOthersGuesses && p.guessText) {
            secondary = p.guessText;
          } else {
            secondary = done ? 'Locked in' : 'Choosing';
          }

          const successTone = showGuessedRight && showOthersGuesses && isTyping
            ? 'success.main'
            : done && (!showOthersGuesses || !isTyping || showGuessedRight)
              ? 'success.main'
              : 'text.secondary';

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
                <Typography
                  variant="caption"
                  color={successTone}
                  noWrap
                  sx={{ display: 'block' }}
                >
                  {secondary}
                </Typography>
              </Box>
              {showOwnTypingProgress ? (
                <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0 }}>
                  <StatusPill on={!!p.artistCorrect} label="Artist" />
                  <StatusPill on={!!p.titleCorrect} label="Song" />
                </Stack>
              ) : (isTyping && showOthersGuesses && p.done) || (!isTyping && done) ? (
                <CheckRoundedIcon sx={{ color: 'success.main' }} />
              ) : null}
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
          {showOthersGuesses
            ? 'Wrong guesses appear here as clues. Correct guesses only show as “Guessed right”.'
            : 'The clock speeds up once someone lands both. Round ends when everyone has the full answer.'}
        </Typography>
      )}
    </Box>
  );
});
