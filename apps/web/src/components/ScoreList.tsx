import { Box, Stack, Typography } from '@mui/material';
import { PlayerAvatar } from './PlayerAvatar';
import { shortBoard, type Ranked } from './shortBoard';

interface ScoreEntry {
  playerId: string;
  displayName: string;
  score: number;
}

/** A dotted rule with a few words in the middle: "your place", "and 14 more". */
function Gap({ label, large = false }: { label: string; large?: boolean }) {
  return (
    <Stack
      direction="row"
      alignItems="center"
      spacing={1}
      sx={{
        px: 1,
        color: 'text.secondary',
        fontWeight: 600,
        fontSize: large ? '1.1rem' : '0.9rem',
        '&::before, &::after': { content: '""', flex: 1, borderTop: '2px dotted rgba(20,33,63,0.12)' },
      }}
    >
      <span>{label}</span>
    </Stack>
  );
}

/**
 * Scores in order, one row each. With `compact` (a big room) it shows the
 * top five, your own place and how many more, unless `showAll`. `large` sizes
 * it to read across a room, and `gains` adds the points each player just won.
 */
export function ScoreList({
  entries,
  myId,
  compact,
  showAll = false,
  firstPosition = 1,
  show = 5,
  large = false,
  gains,
}: {
  entries: ScoreEntry[];
  myId: string | null | undefined;
  compact: boolean;
  showAll?: boolean;
  firstPosition?: number;
  show?: number;
  large?: boolean;
  /** Points won this round, by player id. */
  gains?: Record<string, number>;
}) {
  const board = shortBoard(entries, myId, { compact: compact && !showAll, show, firstPosition });

  const row = ({ entry, position }: Ranked<ScoreEntry>) => {
    const isMe = entry.playerId === myId;
    const gain = gains?.[entry.playerId] ?? 0;
    const text = large ? { xs: '1.1rem', sm: '1.3rem' } : undefined;
    return (
      <Stack
        key={entry.playerId}
        direction="row"
        spacing={1.5}
        alignItems="center"
        sx={{
          p: 1,
          borderRadius: '16px',
          bgcolor: isMe ? 'rgba(58,107,255,0.08)' : 'transparent',
          boxShadow: large && isMe ? 'inset 0 0 0 3px #3A6BFF' : 'none',
        }}
      >
        <Typography
          sx={{
            width: large ? 36 : 28,
            textAlign: 'center',
            fontWeight: 700,
            fontSize: text,
            color: position === 1 ? 'warning.main' : 'text.secondary',
            fontFamily: '"Fredoka", sans-serif',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {position}
        </Typography>
        <PlayerAvatar id={entry.playerId} size={large ? 48 : 36} />
        <Typography fontWeight={700} sx={{ flex: 1, fontSize: text }} noWrap>
          {entry.displayName}
          {isMe && <Box component="span" sx={{ color: 'primary.main' }}> · you</Box>}
        </Typography>
        {gain > 0 && (
          <Box
            sx={{
              px: 1.25,
              py: 0.25,
              borderRadius: 999,
              bgcolor: 'rgba(22,199,154,0.16)',
              color: '#0B7A5C',
              fontWeight: 700,
              fontSize: large ? { xs: '0.95rem', sm: '1.1rem' } : '0.85rem',
              fontVariantNumeric: 'tabular-nums',
              flexShrink: 0,
            }}
          >
            +{gain}
          </Box>
        )}
        <Typography
          fontWeight={700}
          sx={{ fontSize: text, fontVariantNumeric: 'tabular-nums', minWidth: large ? 64 : 0, textAlign: 'right' }}
        >
          {entry.score}
        </Typography>
      </Stack>
    );
  };

  return (
    <Stack spacing={1} sx={{ mt: 1 }}>
      {board.top.map(row)}
      {board.mine && (
        <>
          <Gap label="your place" large={large} />
          {row(board.mine)}
        </>
      )}
      {board.more > 0 && <Gap label={`and ${board.more} more`} large={large} />}
    </Stack>
  );
}
