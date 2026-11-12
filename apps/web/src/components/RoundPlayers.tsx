import { memo, useRef } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { COMPACT_ROSTER_AFTER, type GameMode, type RoundPlayerStatus, type TriviaKind } from '@wemsic/shared';
import { PlayerAvatar } from './PlayerAvatar';

const HEADER_SX = { fontWeight: 700, fontSize: '1.4rem', fontFamily: '"Fredoka", sans-serif' } as const;

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
        px: 1.4,
        py: 0.4,
        borderRadius: 999,
        fontSize: '0.85rem',
        fontWeight: 700,
        letterSpacing: '0.02em',
        color: on ? 'success.contrastText' : 'text.secondary',
        bgcolor: on ? 'success.main' : 'rgba(20,33,63,0.06)',
        transition: 'background-color 160ms ease, color 160ms ease',
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
  roundIndex,
  trivia,
}: {
  players: RoundPlayerStatus[];
  currentPlayerId: string;
  gameMode?: GameMode;
  showOthersGuesses?: boolean;
  roundIndex?: number;
  /** Trivia rounds have one answer, so typing shows no Artist/Song pills. */
  trivia?: TriviaKind;
}) {
  const isTyping = gameMode === 'typing' && !trivia;
  const triviaTyping = gameMode === 'typing' && !!trivia;
  const stickyProgressRef = useRef(new Map<string, { artistCorrect: boolean; titleCorrect: boolean }>());
  const lastRoundRef = useRef<number | undefined>(undefined);

  if (roundIndex !== undefined && roundIndex !== lastRoundRef.current) {
    stickyProgressRef.current.clear();
    lastRoundRef.current = roundIndex;
  }

  // A big room shows an avatar grid with a bar for how many have answered.
  const compact = players.length > COMPACT_ROSTER_AFTER;
  const answered = players.filter((p) =>
    isTyping ? p.bothCorrect || (p.artistCorrect && p.titleCorrect) : p.done,
  ).length;

  return (
    <Box
      sx={{
        bgcolor: 'background.paper',
        border: '1px solid rgba(20,33,63,0.06)',
        borderRadius: '24px',
        p: 2.5,
        boxShadow: '0 18px 40px -28px rgba(20,33,63,0.3)',
      }}
    >
      {compact ? (
        <>
          <Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ px: 0.5 }}>
            <Typography sx={HEADER_SX}>Players</Typography>
            <Typography color="text.secondary" fontWeight={700} sx={{ fontSize: '1.15rem', fontVariantNumeric: 'tabular-nums' }}>
              {answered} of {players.length} {isTyping ? 'got it' : 'answered'}
            </Typography>
          </Stack>
          <Box sx={{ mt: 1, mb: 1.5, height: 10, borderRadius: 999, bgcolor: 'rgba(20,33,63,0.07)', overflow: 'hidden' }}>
            <Box
              sx={{
                height: '100%',
                width: `${(answered / players.length) * 100}%`,
                bgcolor: 'success.main',
                transition: 'width 300ms ease',
              }}
            />
          </Box>
        </>
      ) : (
        <Typography sx={{ ...HEADER_SX, px: 0.5 }}>
          Players · {players.length}
        </Typography>
      )}
      <Box
        sx={
          compact
            ? { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 1 }
            : { display: 'flex', flexDirection: 'column', gap: 1, mt: 1 }
        }
      >
        {players.map((p) => {
          const isMe = p.playerId === currentPlayerId;
          const showWrongGuess = showOthersGuesses && isTyping && !!p.guessText;
          const showGuessedRight = showOthersGuesses && isTyping && !!p.guessedRight;

          const sticky = stickyProgressRef.current.get(p.playerId) ?? {
            artistCorrect: false,
            titleCorrect: false,
          };
          const artistCorrect = sticky.artistCorrect || !!p.artistCorrect;
          const titleCorrect = sticky.titleCorrect || !!p.titleCorrect;
          stickyProgressRef.current.set(p.playerId, { artistCorrect, titleCorrect });

          const bothCorrect = artistCorrect && titleCorrect;
          const done = isTyping
            ? showOthersGuesses
              ? bothCorrect || (!!p.guessedRight && !showWrongGuess)
              : bothCorrect
            : p.done;

          let secondary: string;
          if (triviaTyping) {
            secondary =
              showOthersGuesses && p.guessText && !p.done
                ? p.guessText
                : p.bothCorrect
                  ? 'Got it'
                  : p.done
                    ? 'Locked in'
                    : 'Thinking';
          } else if (showWrongGuess) {
            secondary = p.guessText!;
          } else if (showGuessedRight) {
            secondary = 'Guessed right';
          } else if (isTyping) {
            secondary = !showOthersGuesses || isMe ? typingSecondary({ ...p, artistCorrect, titleCorrect, bothCorrect }) : 'Guessing';
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

          if (compact) {
            return (
              <Stack
                key={p.playerId}
                alignItems="center"
                spacing={0.5}
                sx={{
                  minWidth: 0,
                  px: 0.5,
                  pt: 1,
                  pb: 0.75,
                  borderRadius: '14px',
                  bgcolor: done ? 'rgba(22,199,154,0.12)' : 'transparent',
                  boxShadow: isMe ? 'inset 0 0 0 2px #3A6BFF' : 'none',
                  transition: 'background-color 200ms ease',
                }}
              >
                <PlayerAvatar id={p.playerId} size={56} done={isTyping ? bothCorrect : done} />
                <Typography fontWeight={700} noWrap sx={{ fontSize: '1.05rem', maxWidth: '100%' }}>
                  {isMe ? 'You' : p.displayName}
                </Typography>
              </Stack>
            );
          }

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
              <PlayerAvatar id={p.playerId} size={52} done={isTyping ? bothCorrect : done} />
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography fontWeight={700} noWrap sx={{ fontSize: '1.3rem', lineHeight: 1.15 }}>
                  {p.displayName}
                  {isMe && (
                    <Box component="span" sx={{ color: 'primary.main' }}> · you</Box>
                  )}
                </Typography>
                <Typography color={successTone} noWrap sx={{ display: 'block', fontSize: '1.05rem', fontWeight: 600 }}>
                  {secondary}
                </Typography>
              </Box>
              {isTyping ? (
                <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0 }}>
                  <StatusPill on={artistCorrect} label="Artist" />
                  <StatusPill on={titleCorrect} label="Song" />
                </Stack>
              ) : null}
            </Stack>
          );
        })}
      </Box>
      {triviaTyping && (
        <Typography
          color="text.secondary"
          sx={{ mt: 1.5, px: 0.5, display: 'block', lineHeight: 1.4, fontSize: '0.95rem' }}
        >
          {trivia === 'year' || trivia === 'added_by'
            ? 'One answer each. Everyone finds out at the reveal.'
            : 'Keep guessing until you get it. The round ends when everyone has.'}
        </Typography>
      )}
      {isTyping && (
        <Typography
          color="text.secondary"
          sx={{ mt: 1.5, px: 0.5, display: 'block', lineHeight: 1.4, fontSize: '0.95rem' }}
        >
          {showOthersGuesses
            ? 'Wrong guesses appear here as clues. Correct guesses only show as “Guessed right”.'
            : 'The clock speeds up once someone lands both. Round ends when everyone has the full answer.'}
        </Typography>
      )}
    </Box>
  );
});
