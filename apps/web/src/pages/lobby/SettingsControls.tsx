import { Box, Stack, TextField, Typography } from '@mui/material';
import type { QuestionSet, TypingSpellingLeniency } from '@wemsic/shared';
import { useState } from 'react';
import { settleSetting, validSetting } from './numberSetting';

const SPELLING_LENIENCY_OPTIONS: {
  value: TypingSpellingLeniency;
  title: string;
  desc: string;
  recommended?: boolean;
}[] = [
  {
    value: 'lenient',
    title: 'Lenient',
    desc: 'Forgives typos and missing spaces.',
  },
  {
    value: 'normal',
    title: 'Normal',
    desc: 'Minor typos OK, spaces flexible.',
    recommended: true,
  },
  {
    value: 'hard',
    title: 'Hard',
    desc: 'Exact spelling, spaces, and punctuation.',
  },
];

const GUESS_VISIBILITY_OPTIONS = [
  { value: false, title: 'Hidden' },
  { value: true, title: 'Visible' },
] as const;

export function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  hideLabel = false,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  /** When a row label beside the field already says what it is; screen readers still get `label`. */
  hideLabel?: boolean;
}) {
  // What's in the field while the host is editing it; null shows `value`.
  const [draft, setDraft] = useState<string | null>(null);

  function settle() {
    if (draft === null) return;
    const n = settleSetting(draft, min, max);
    if (n !== null && n !== value) onChange(n);
    setDraft(null);
  }

  return (
    <TextField
      label={hideLabel ? undefined : label}
      type="number"
      size="small"
      sx={{ flex: 1 }}
      value={draft ?? value}
      onChange={(e) => {
        setDraft(e.target.value);
        // Send right away once it's a real value, so the arrows and fully
        // typed numbers update the room without waiting for blur.
        const n = validSetting(e.target.value, min, max);
        if (n !== null && n !== value) onChange(n);
      }}
      onBlur={settle}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
      }}
      inputProps={{ min, max, 'aria-label': label }}
    />
  );
}

/** Pill-style single choice, one equal-width column per option. */
function SegmentedControl<T extends string | boolean>({
  options,
  value,
  onChange,
}: {
  options: readonly { value: T; title: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: `repeat(${options.length}, 1fr)`,
        gap: 0.75,
        p: 0.5,
        borderRadius: '14px',
        bgcolor: 'rgba(20,33,63,0.04)',
        border: '1px solid rgba(20,33,63,0.08)',
      }}
    >
      {options.map((option) => {
        const active = value === option.value;
        return (
          <Box
            key={String(option.value)}
            role="button"
            tabIndex={0}
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') onChange(option.value);
            }}
            sx={{
              cursor: 'pointer',
              borderRadius: '10px',
              py: 1,
              px: 0.75,
              textAlign: 'center',
              bgcolor: active ? 'background.paper' : 'transparent',
              boxShadow: active ? '0 4px 14px -8px rgba(20,33,63,0.35)' : 'none',
              border: '2px solid',
              borderColor: active ? 'primary.main' : 'transparent',
              transition: 'all 160ms ease',
              '&:hover': {
                borderColor: active ? 'primary.main' : 'rgba(58,107,255,0.35)',
              },
            }}
          >
            <Typography
              variant="body2"
              fontWeight={700}
              sx={{ color: active ? 'primary.main' : 'text.primary', lineHeight: 1.2 }}
            >
              {option.title}
            </Typography>
          </Box>
        );
      })}
    </Box>
  );
}

const QUESTION_SET_OPTIONS = [
  { value: 'song', title: 'Song name' },
  { value: 'trivia', title: 'Trivia mix' },
] as const;

/** Name the song every round, or a mix of questions about each song. */
export function QuestionSetSegment({
  value,
  onChange,
}: {
  value: QuestionSet;
  onChange: (value: QuestionSet) => void;
}) {
  return (
    <Stack spacing={1}>
      <SegmentedControl<QuestionSet> options={QUESTION_SET_OPTIONS} value={value} onChange={onChange} />
      <Typography variant="caption" color="text.secondary" sx={{ px: 0.25, lineHeight: 1.45 }}>
        {value === 'trivia'
          ? 'Each round asks one question: the song, the artist, the album, the year, or who added it (with 3 or more people).'
          : 'Every round asks what the song is.'}
      </Typography>
    </Stack>
  );
}

export function GuessVisibilitySegment({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <SegmentedControl<boolean>
      options={GUESS_VISIBILITY_OPTIONS}
      value={value}
      onChange={onChange}
    />
  );
}

export function LeniencySegment({
  value,
  onChange,
}: {
  value: TypingSpellingLeniency;
  onChange: (value: TypingSpellingLeniency) => void;
}) {
  const activeOption =
    SPELLING_LENIENCY_OPTIONS.find((o) => o.value === value) ??
    SPELLING_LENIENCY_OPTIONS[1];

  return (
    <Stack spacing={1.25}>
      <SegmentedControl options={SPELLING_LENIENCY_OPTIONS} value={value} onChange={onChange} />
      <Typography variant="caption" color="text.secondary" sx={{ px: 0.25, lineHeight: 1.45 }}>
        {activeOption.desc}
        {activeOption.recommended && ' Recommended.'}
      </Typography>
    </Stack>
  );
}
