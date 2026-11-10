import BoltRoundedIcon from '@mui/icons-material/BoltRounded';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import KeyboardRoundedIcon from '@mui/icons-material/KeyboardRounded';
import { Box, Button, ButtonBase, Card, CardContent, Chip, Collapse, Stack, Typography } from '@mui/material';
import type { LobbyState } from '@wemsic/shared';
import { useState } from 'react';
import {
  GuessVisibilitySegment,
  LeniencySegment,
  NumberField,
  QuestionSetSegment,
} from './SettingsControls';

type RoomSettings = LobbyState['settings'];

const TITLE_SX = { fontSize: { xs: '1.5rem', sm: '1.7rem' } };

function ModeTile({
  active,
  onClick,
  icon,
  title,
  desc,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <ButtonBase
      onClick={onClick}
      aria-pressed={active}
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        alignItems: { xs: 'flex-start', sm: 'center' },
        justifyContent: 'flex-start',
        gap: { xs: 1, sm: 1.75 },
        textAlign: 'left',
        borderRadius: '18px',
        p: { xs: 2, sm: 2.5 },
        border: '2px solid',
        borderColor: active ? 'primary.main' : 'rgba(20,33,63,0.1)',
        bgcolor: active ? 'rgba(58,107,255,0.08)' : 'background.paper',
        transition: 'border-color 160ms ease, background-color 160ms ease',
        '&:hover': { borderColor: 'primary.main' },
        '&.Mui-focusVisible': { outline: '3px solid', outlineColor: 'primary.main', outlineOffset: 2 },
      }}
    >
      <Box sx={{ color: active ? 'primary.main' : 'text.secondary', display: 'flex', '& svg': { fontSize: 32 } }}>
        {icon}
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ fontFamily: '"Fredoka", sans-serif', fontWeight: 600, fontSize: '1.35rem', lineHeight: 1.2 }}>
          {title}
        </Typography>
        <Typography color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' } }}>
          {desc}
        </Typography>
      </Box>
    </ButtonBase>
  );
}

/** One More options row: a plain label on the left, its control on the right (stacked on phones). */
function OptionRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: '190px minmax(0, 1fr)' },
        alignItems: 'start',
        gap: { xs: 1, sm: 2 },
      }}
    >
      <Typography fontWeight={700} sx={{ fontSize: '1.05rem', pt: { sm: 1 } }}>
        {label}
      </Typography>
      <Box sx={{ minWidth: 0, maxWidth: 420 }}>{children}</Box>
    </Box>
  );
}

/**
 * Host-only "Game" card: the two modes up front, and everything else behind
 * More options, which opens in place.
 */
export function GameSettingsCard({
  settings,
  onChange,
}: {
  settings: RoomSettings;
  onChange: (settings: Partial<RoomSettings>) => void;
}) {
  const [moreOpen, setMoreOpen] = useState(false);
  const typing = settings.gameMode === 'typing';

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
        <Typography variant="h5" sx={{ ...TITLE_SX, mb: 2 }}>
          Game
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 1.5 }}>
          <ModeTile
            active={!typing}
            onClick={() => onChange({ gameMode: 'speed_choice' })}
            icon={<BoltRoundedIcon />}
            title="Speed choice"
            desc="Tap the right answer first"
          />
          <ModeTile
            active={typing}
            onClick={() => onChange({ gameMode: 'typing' })}
            icon={<KeyboardRoundedIcon />}
            title="Typing"
            desc="Type the answer"
          />
        </Box>

        <Button
          onClick={() => setMoreOpen((open) => !open)}
          aria-expanded={moreOpen}
          aria-controls="more-options"
          endIcon={
            <ExpandMoreRoundedIcon
              sx={{ transform: moreOpen ? 'rotate(180deg)' : 'none', transition: 'transform 200ms ease' }}
            />
          }
          sx={{ mt: 1.5, ml: -1.5, px: 1.5, fontSize: '1.05rem' }}
        >
          More options
        </Button>

        <Collapse in={moreOpen} id="more-options">
          <Stack
            spacing={2.5}
            sx={{ mt: 1.5, pt: 2.5, borderTop: '1px solid rgba(20,33,63,0.08)' }}
          >
            <OptionRow label="Questions">
              <QuestionSetSegment
                value={settings.questionSet ?? 'song'}
                onChange={(questionSet) => onChange({ questionSet })}
              />
            </OptionRow>
            <OptionRow label="Rounds">
              <Box sx={{ display: 'flex', maxWidth: 160 }}>
                <NumberField
                  label="Rounds"
                  hideLabel
                  value={settings.roundCount}
                  onChange={(v) => onChange({ roundCount: v })}
                  min={5}
                  max={30}
                />
              </Box>
            </OptionRow>
            <OptionRow label="Seconds per round">
              <Box sx={{ display: 'flex', maxWidth: 160 }}>
                <NumberField
                  label="Seconds per round"
                  hideLabel
                  value={settings.roundDurationSeconds}
                  onChange={(v) => onChange({ roundDurationSeconds: v })}
                  min={10}
                  max={60}
                />
              </Box>
            </OptionRow>
            <OptionRow label="Others’ guesses">
              <Stack spacing={1}>
                <GuessVisibilitySegment
                  value={settings.showOthersGuesses ?? false}
                  onChange={(showOthersGuesses) => onChange({ showOthersGuesses })}
                />
                <Typography variant="caption" color="text.secondary" sx={{ px: 0.25, lineHeight: 1.45 }}>
                  {typing
                    ? 'When visible, wrong guesses appear as clues. Correct ones only show as “Guessed right”.'
                    : 'When visible, everyone sees which answer each player picked.'}
                </Typography>
              </Stack>
            </OptionRow>
            {typing && (
              <OptionRow label="Spelling">
                <LeniencySegment
                  value={settings.typingSpellingLeniency ?? 'normal'}
                  onChange={(typingSpellingLeniency) => onChange({ typingSpellingLeniency })}
                />
              </OptionRow>
            )}
          </Stack>
        </Collapse>
      </CardContent>
    </Card>
  );
}

/** Everyone but the host: just what they'll be playing. */
export function GameSettingsSummary({ settings }: { settings: RoomSettings }) {
  const typing = settings.gameMode === 'typing';
  return (
    <Card sx={{ mb: 3 }}>
      <CardContent sx={{ p: { xs: 2.5, sm: 3 }, '&:last-child': { pb: { xs: 2.5, sm: 3 } } }}>
        <Typography variant="h5" sx={{ ...TITLE_SX, mb: 1.5 }}>
          Game
        </Typography>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box sx={{ color: 'primary.main', display: 'flex', '& svg': { fontSize: 30 } }}>
            {typing ? <KeyboardRoundedIcon /> : <BoltRoundedIcon />}
          </Box>
          <Typography sx={{ fontFamily: '"Fredoka", sans-serif', fontWeight: 600, fontSize: '1.35rem' }}>
            {typing ? 'Typing' : 'Speed choice'}
          </Typography>
          {settings.questionSet === 'trivia' && (
            <Chip
              label="Trivia"
              sx={{ bgcolor: 'rgba(58,107,255,0.12)', color: 'primary.main', fontWeight: 700 }}
            />
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
