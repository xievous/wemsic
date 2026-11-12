import { Alert, Box, Button, Stack, TextField, Typography } from '@mui/material';
import ChangeHistoryRoundedIcon from '@mui/icons-material/ChangeHistoryRounded';
import CircleRoundedIcon from '@mui/icons-material/CircleRounded';
import SquareRoundedIcon from '@mui/icons-material/SquareRounded';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import HexagonRoundedIcon from '@mui/icons-material/HexagonRounded';
import FavoriteRoundedIcon from '@mui/icons-material/FavoriteRounded';
import { TRIVIA_PLACEHOLDERS, type McqOption, type TriviaKind } from '@wemsic/shared';
import type { Ref } from 'react';
import { TILE_COLORS } from '../../theme';

const TILE_SHAPES = [
  ChangeHistoryRoundedIcon,
  CircleRoundedIcon,
  SquareRoundedIcon,
  StarRoundedIcon,
  HexagonRoundedIcon,
  FavoriteRoundedIcon,
];

/** Tappable speed-choice tiles for players and pads. */
export function McqOptions({
  options,
  selectedOption,
  answered,
  onSelect,
}: {
  options: McqOption[];
  selectedOption: McqOption | null;
  answered: boolean;
  onSelect: (option: McqOption) => void;
}) {
  function handlePointerDown(e: React.PointerEvent, option: McqOption) {
    if (answered || e.button !== 0) return;
    e.preventDefault();
    onSelect(option);
  }

  function handleKeyDown(e: React.KeyboardEvent, option: McqOption) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    if (e.repeat) return;
    onSelect(option);
  }

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
        gap: 2,
      }}
    >
      {options.map((opt, i) => {
        const c = TILE_COLORS[i % TILE_COLORS.length];
        const Shape = TILE_SHAPES[i % TILE_SHAPES.length];
        const isSelected = selectedOption?.id === opt.id;
        const dimmed = answered && !isSelected;
        return (
          <Box
            key={opt.id}
            role="button"
            tabIndex={answered ? -1 : 0}
            onPointerDown={(e) => handlePointerDown(e, opt)}
            onKeyDown={(e) => handleKeyDown(e, opt)}
            sx={{
              position: 'relative',
              cursor: answered ? 'default' : 'pointer',
              borderRadius: '22px',
              px: { xs: 2.5, sm: 3 },
              py: { xs: 2.5, sm: 3.5 },
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              color: c.text,
              background: c.bg,
              boxShadow: dimmed ? 'none' : `0 6px 0 ${c.shadow}`,
              opacity: dimmed ? 0.45 : 1,
              transition: 'opacity 160ms ease',
              outline: isSelected ? '3px solid rgba(255,255,255,0.95)' : 'none',
              outlineOffset: isSelected ? '-3px' : 0,
              userSelect: 'none',
              touchAction: 'manipulation',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <Shape sx={{ fontSize: { xs: 30, sm: 38 }, flexShrink: 0, opacity: 0.95 }} />
            <Typography fontWeight={700} sx={{ fontSize: { xs: '1.2rem', sm: '1.5rem' }, lineHeight: 1.2 }}>
              {opt.label}
            </Typography>
          </Box>
        );
      })}
    </Box>
  );
}

/** Larger, read-only tiles for the host shared screen. */
export function PresenterOptions({ options }: { options: McqOption[] }) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
        gap: { xs: 2, sm: 3 },
      }}
    >
      {options.map((opt, i) => {
        const c = TILE_COLORS[i % TILE_COLORS.length];
        const Shape = TILE_SHAPES[i % TILE_SHAPES.length];
        return (
          <Box
            key={opt.id}
            sx={{
              borderRadius: '26px',
              px: { xs: 3, sm: 4 },
              py: { xs: 3.5, sm: 5 },
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              color: c.text,
              background: c.bg,
              boxShadow: `0 6px 0 ${c.shadow}`,
            }}
          >
            <Shape sx={{ fontSize: { xs: 40, sm: 56 }, flexShrink: 0, opacity: 0.95 }} />
            <Typography
              fontWeight={700}
              sx={{ fontSize: { xs: '1.5rem', sm: '2.2rem' }, lineHeight: 1.15 }}
            >
              {opt.label}
            </Typography>
          </Box>
        );
      })}
    </Box>
  );
}

export function TypingInput({
  guess,
  onGuessChange,
  onSubmit,
  disabled,
  containerRef,
  trivia,
  hint,
}: {
  guess: string;
  onGuessChange: (value: string) => void;
  onSubmit: (e?: React.FormEvent) => void;
  disabled: boolean;
  /** Element the shake/ding feedback animates. */
  containerRef: Ref<HTMLDivElement>;
  /** Trivia rounds: the question being answered. */
  trivia?: TriviaKind;
  /** Why the last guess wasn't taken. */
  hint?: string | null;
}) {
  return (
    <Box component="form" onSubmit={onSubmit}>
      <Stack spacing={1.5}>
        <Box ref={containerRef} sx={{ borderRadius: 3, overflow: 'visible' }}>
          <TextField
            label={trivia ? 'Your answer' : 'Your guess'}
            placeholder={trivia ? TRIVIA_PLACEHOLDERS[trivia] : 'Artist, song, or both'}
            helperText={hint ?? undefined}
            value={guess}
            onChange={(e) => onGuessChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                onSubmit();
              }
            }}
            fullWidth
            autoFocus
            disabled={disabled}
            multiline
            minRows={1}
            maxRows={3}
            sx={{
              '& .MuiInputBase-input': { fontSize: { xs: '1.2rem', sm: '1.45rem' }, fontWeight: 600 },
              '& .MuiInputLabel-root': { fontSize: '1.1rem' },
              '& .MuiFormHelperText-root': { fontSize: '1rem' },
            }}
          />
        </Box>
        <Button
          type="submit"
          variant="contained"
          size="large"
          disabled={disabled || !guess.trim()}
          sx={{ alignSelf: 'flex-end', fontSize: '1.2rem', px: 4, py: 1.5 }}
        >
          {trivia === 'year' || trivia === 'added_by' ? 'Lock in' : 'Submit guess'}
        </Button>
      </Stack>
    </Box>
  );
}

const STATUS_SX = {
  fontSize: { xs: '1.05rem', sm: '1.25rem' },
  fontWeight: 600,
  alignItems: 'center',
  '& .MuiAlert-icon': { fontSize: 28 },
};

/** "Locked in" / "both correct" confirmations above the answer controls. */
export function AnswerStatus({
  isTyping,
  mcqAnswered,
  myBothCorrect,
  trivia,
  triviaLocked = false,
}: {
  isTyping: boolean;
  mcqAnswered: boolean;
  myBothCorrect: boolean | undefined;
  trivia?: TriviaKind;
  triviaLocked?: boolean;
}) {
  if (!isTyping && mcqAnswered) {
    return <Alert sx={STATUS_SX} severity="success">Answer locked in. Hold tight.</Alert>;
  }
  if (isTyping && trivia) {
    if (!triviaLocked) return null;
    // A year or a name is final; whether it's right waits for the reveal.
    return trivia === 'year' || trivia === 'added_by' ? (
      <Alert sx={STATUS_SX} severity="info">Answer locked in. Find out at the reveal.</Alert>
    ) : (
      <Alert sx={STATUS_SX} severity="success">That's right. Waiting on the rest.</Alert>
    );
  }
  if (isTyping && myBothCorrect) {
    return (
      <Alert sx={STATUS_SX} severity="success">
        Artist and song, both correct. Waiting on the rest.
      </Alert>
    );
  }
  return null;
}
