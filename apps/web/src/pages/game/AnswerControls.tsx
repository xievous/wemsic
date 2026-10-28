import { Alert, Box, Button, Stack, TextField, Typography } from '@mui/material';
import ChangeHistoryRoundedIcon from '@mui/icons-material/ChangeHistoryRounded';
import CircleRoundedIcon from '@mui/icons-material/CircleRounded';
import SquareRoundedIcon from '@mui/icons-material/SquareRounded';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import HexagonRoundedIcon from '@mui/icons-material/HexagonRounded';
import FavoriteRoundedIcon from '@mui/icons-material/FavoriteRounded';
import type { McqOption } from '@wemsic/shared';
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
  selectedOption: string | null;
  answered: boolean;
  onSelect: (optionId: string) => void;
}) {
  function handlePointerDown(e: React.PointerEvent, optionId: string) {
    if (answered || e.button !== 0) return;
    e.preventDefault();
    onSelect(optionId);
  }

  function handleKeyDown(e: React.KeyboardEvent, optionId: string) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    if (e.repeat) return;
    onSelect(optionId);
  }

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
        gap: 1.5,
      }}
    >
      {options.map((opt, i) => {
        const c = TILE_COLORS[i % TILE_COLORS.length];
        const Shape = TILE_SHAPES[i % TILE_SHAPES.length];
        const isSelected = selectedOption === opt.id;
        const dimmed = answered && !isSelected;
        return (
          <Box
            key={opt.id}
            role="button"
            tabIndex={answered ? -1 : 0}
            onPointerDown={(e) => handlePointerDown(e, opt.id)}
            onKeyDown={(e) => handleKeyDown(e, opt.id)}
            sx={{
              position: 'relative',
              cursor: answered ? 'default' : 'pointer',
              borderRadius: '18px',
              px: 2.5,
              py: { xs: 2.25, sm: 2.75 },
              display: 'flex',
              alignItems: 'center',
              gap: 1.75,
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
            <Shape sx={{ fontSize: 26, flexShrink: 0, opacity: 0.95 }} />
            <Typography fontWeight={700} sx={{ fontSize: '1.05rem', lineHeight: 1.2 }}>
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
        gap: { xs: 1.5, sm: 2 },
      }}
    >
      {options.map((opt, i) => {
        const c = TILE_COLORS[i % TILE_COLORS.length];
        const Shape = TILE_SHAPES[i % TILE_SHAPES.length];
        return (
          <Box
            key={opt.id}
            sx={{
              borderRadius: '18px',
              px: { xs: 2.5, sm: 3 },
              py: { xs: 2.75, sm: 3.5 },
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              color: c.text,
              background: c.bg,
              boxShadow: `0 6px 0 ${c.shadow}`,
            }}
          >
            <Shape sx={{ fontSize: 34, flexShrink: 0, opacity: 0.95 }} />
            <Typography
              fontWeight={700}
              sx={{ fontSize: { xs: '1.2rem', sm: '1.5rem' }, lineHeight: 1.2 }}
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
}: {
  guess: string;
  onGuessChange: (value: string) => void;
  onSubmit: (e?: React.FormEvent) => void;
  disabled: boolean;
  /** Element the shake/ding feedback animates. */
  containerRef: Ref<HTMLDivElement>;
}) {
  return (
    <Box component="form" onSubmit={onSubmit}>
      <Stack spacing={1.5}>
        <Box ref={containerRef} sx={{ borderRadius: 3, overflow: 'visible' }}>
          <TextField
            label="Your guess"
            placeholder="Artist, song, or both"
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
          />
        </Box>
        <Button
          type="submit"
          variant="contained"
          size="large"
          disabled={disabled || !guess.trim()}
          sx={{ alignSelf: 'flex-end' }}
        >
          Submit guess
        </Button>
      </Stack>
    </Box>
  );
}

/** "Locked in" / "both correct" confirmations above the answer controls. */
export function AnswerStatus({
  isTyping,
  mcqAnswered,
  myBothCorrect,
}: {
  isTyping: boolean;
  mcqAnswered: boolean;
  myBothCorrect: boolean | undefined;
}) {
  if (!isTyping && mcqAnswered) {
    return <Alert severity="success">Answer locked in. Hold tight.</Alert>;
  }
  if (isTyping && myBothCorrect) {
    return (
      <Alert severity="success">
        Artist and song, both correct. Waiting on the rest.
      </Alert>
    );
  }
  return null;
}
