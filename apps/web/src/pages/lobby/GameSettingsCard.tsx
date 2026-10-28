import BoltRoundedIcon from '@mui/icons-material/BoltRounded';
import KeyboardRoundedIcon from '@mui/icons-material/KeyboardRounded';
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';
import {
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import type { LobbyState } from '@wemsic/shared';
import { useState } from 'react';
import {
  AdvancedSettingsSection,
  GuessVisibilitySegment,
  LeniencySegment,
  NumberField,
  SPELLING_LENIENCY_OPTIONS,
} from './SettingsControls';

type RoomSettings = LobbyState['settings'];

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
    <Box
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onClick()}
      sx={{
        flex: 1,
        cursor: 'pointer',
        borderRadius: '18px',
        p: 2,
        border: '2px solid',
        borderColor: active ? 'primary.main' : 'rgba(20,33,63,0.1)',
        bgcolor: active ? 'rgba(58,107,255,0.08)' : 'background.paper',
        transition: 'all 160ms ease',
        '&:hover': { borderColor: 'primary.main', transform: 'translateY(-2px)' },
      }}
    >
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
        <Box sx={{ color: active ? 'primary.main' : 'text.secondary', display: 'flex' }}>
          {icon}
        </Box>
        <Typography fontWeight={700}>{title}</Typography>
      </Stack>
      <Typography variant="body2" color="text.secondary">
        {desc}
      </Typography>
    </Box>
  );
}

/** Host-only: game mode picker, settings summary, and the advanced settings dialog. */
export function GameSettingsCard({
  settings,
  onChange,
}: {
  settings: RoomSettings;
  onChange: (settings: Partial<RoomSettings>) => void;
}) {
  const [advancedOpen, setAdvancedOpen] = useState(false);

  return (
    <>
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{ mb: 2 }}
          >
            <Typography variant="h5">Game settings</Typography>
            <Tooltip title="Advanced settings">
              <IconButton
                aria-label="Advanced settings"
                onClick={() => setAdvancedOpen(true)}
                sx={{
                  bgcolor: 'rgba(58,107,255,0.08)',
                  '&:hover': { bgcolor: 'rgba(58,107,255,0.14)' },
                }}
              >
                <SettingsRoundedIcon />
              </IconButton>
            </Tooltip>
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <ModeTile
              active={settings.gameMode === 'speed_choice'}
              onClick={() => onChange({ gameMode: 'speed_choice' })}
              icon={<BoltRoundedIcon />}
              title="Speed choice"
              desc="Tap the right answer fastest"
            />
            <ModeTile
              active={settings.gameMode === 'typing'}
              onClick={() => onChange({ gameMode: 'typing' })}
              icon={<KeyboardRoundedIcon />}
              title="Typing"
              desc="Type the artist and the song"
            />
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            {settings.roundCount} rounds · {settings.roundDurationSeconds}s per round
            {settings.gameMode === 'typing' && (
              <>
                {' '}
                ·{' '}
                {SPELLING_LENIENCY_OPTIONS.find(
                  (o) => o.value === (settings.typingSpellingLeniency ?? 'normal'),
                )?.title ?? 'Normal'}{' '}
                spelling
              </>
            )}
            {' · '}
            {settings.showOthersGuesses ? 'guesses visible' : 'guesses hidden'}
          </Typography>
        </CardContent>
      </Card>

      <Dialog
        open={advancedOpen}
        onClose={() => setAdvancedOpen(false)}
        fullWidth
        maxWidth="sm"
        PaperProps={{ sx: { borderRadius: '20px' } }}
      >
        <DialogTitle sx={{ pb: 1 }}>Advanced settings</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Stack spacing={2.5} divider={<Divider flexItem sx={{ borderColor: 'rgba(20,33,63,0.08)' }} />}>
            <AdvancedSettingsSection
              title="Round length"
              description="How many rounds to play and how long each round lasts."
            >
              <Stack direction="row" spacing={1.5}>
                <NumberField
                  label="Rounds"
                  value={settings.roundCount}
                  onChange={(v) => onChange({ roundCount: v })}
                  min={5}
                  max={30}
                />
                <NumberField
                  label="Seconds per round"
                  value={settings.roundDurationSeconds}
                  onChange={(v) => onChange({ roundDurationSeconds: v })}
                  min={10}
                  max={60}
                />
              </Stack>
            </AdvancedSettingsSection>

            <AdvancedSettingsSection
              title="Other players' guesses"
              description={
                settings.gameMode === 'speed_choice'
                  ? 'When visible, everyone sees which answer each player picked.'
                  : 'When visible, wrong guesses appear as clues. Correct guesses only show as “Guessed right”.'
              }
            >
              <GuessVisibilitySegment
                value={settings.showOthersGuesses ?? false}
                onChange={(showOthersGuesses) => onChange({ showOthersGuesses })}
              />
            </AdvancedSettingsSection>

            {settings.gameMode === 'typing' && (
              <AdvancedSettingsSection
                title="Spelling leniency"
                description="How strictly typed answers are matched."
              >
                <LeniencySegment
                  value={settings.typingSpellingLeniency ?? 'normal'}
                  onChange={(typingSpellingLeniency) => onChange({ typingSpellingLeniency })}
                />
              </AdvancedSettingsSection>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setAdvancedOpen(false)} variant="contained">
            Done
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
