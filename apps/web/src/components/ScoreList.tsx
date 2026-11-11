import { Box, Stack, Typography } from '@mui/material';
import { PlayerAvatar } from './PlayerAvatar';
import { shortBoard, type Ranked } from './shortBoard';

interface ScoreEntry {
  playerId: string;
  displayName: string;
  score: number;
}

/** A dotted rule with a few words in the middle: "your place", "and 14 more". */
function Gap({ label }: { label: string }) {
  return (
    <Stack
      direction="row"
      alignItems="center"
      spacing={1}
      sx={{
        px: 1,
        color: 'text.secondary',
        fontWeight: 600,
        fontSize: '0.9rem',
        '&::before, &::after': { content: '""', flex: 1, borderTop: '2px dotted rgba(20,33,63,0.12)' },
      }}
    >
      <span>{label}</span>
    </Stack>
  );
}

/**
 * Scores in order, one row each. With `compact` (a big room) it shows the
 * top five, your own place and how many more, unless `showAll`.
 */
export function ScoreList({
  entries,
  myId,
  compact,
  showAll = false,
  firstPosition = 1,
  show = 5,
}: {
  entries: ScoreEntry[];
  myId: string | null | undefined;
  compact: boolean;
  showAll?: boolean;
  firstPosition?: number;
  show?: number;
}) {
  const board = shortBoard(entries, myId, { compact: compact && !showAll, show, firstPosition });

  const row = ({ entry, position }: Ranked<ScoreEntry>) => {
    const isMe = entry.playerId === myId;
    return (
      <Stack
        key={entry.playerId}
        direction="row"
        spacing={1.5}
        alignItems="center"
        sx={{ p: 1, borderRadius: '16px', bgcolor: isMe ? 'rgba(58,107,255,0.08)' : 'transparent' }}
      >
        <Typography
          sx={{
            width: 28,
            textAlign: 'center',
            fontWeight: 700,
            color: position === 1 ? 'warning.main' : 'text.secondary',
            fontFamily: '"Fredoka", sans-serif',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {position}
        </Typography>
        <PlayerAvatar id={entry.playerId} size={36} />
        <Typography fontWeight={700} sx={{ flex: 1 }} noWrap>
          {entry.displayName}
          {isMe && <Box component="span" sx={{ color: 'primary.main' }}> · you</Box>}
        </Typography>
        <Typography fontWeight={700} sx={{ fontVariantNumeric: 'tabular-nums' }}>
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
          <Gap label="your place" />
          {row(board.mine)}
        </>
      )}
      {board.more > 0 && <Gap label={`and ${board.more} more`} />}
    </Stack>
  );
}
