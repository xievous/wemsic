import { Box, Stack, Typography } from '@mui/material';
import { RoundPlayers } from '../../components/RoundPlayers';
import { PresenterOptions } from './AnswerControls';
import { RoundReveal } from './RoundReveal';
import { Stage } from './Stage';
import type { GameViewProps } from './types';
import { PresenterWaitingStage } from './Waiting';

/** Host mode, shared screen: big question + sound, read-only answers, no input. */
export function PresenterView({
  playerId,
  round,
  reveal,
  playerStatuses,
  timeLeft,
  progress,
  revealProgress,
  showOthersGuesses,
}: GameViewProps) {
  if (reveal) {
    return (
      <RoundReveal
        reveal={reveal}
        playerId={playerId}
        revealProgress={revealProgress}
        presenter
      />
    );
  }
  if (!round) return <PresenterWaitingStage />;

  return (
    <Stack spacing={2.5} direction={{ xs: 'column', md: 'row' }} alignItems="flex-start">
      <Box sx={{ flex: 1, minWidth: 0, width: '100%' }}>
        <Stack spacing={2.5}>
          <Stage
            roundIndex={round.roundIndex}
            totalRounds={round.totalRounds}
            timeLeft={timeLeft}
            progress={progress}
            presenter
          />

          {round.gameMode === 'speed_choice' && round.options && (
            <PresenterOptions options={round.options} />
          )}

          {round.gameMode === 'typing' && (
            <Box
              sx={{
                textAlign: 'center',
                p: { xs: 3, sm: 4 },
                borderRadius: '24px',
                bgcolor: 'background.paper',
                border: '1px solid rgba(20,33,63,0.06)',
              }}
            >
              <Typography variant="h5" gutterBottom>
                Name that track
              </Typography>
              <Typography color="text.secondary">
                {showOthersGuesses
                  ? 'Players are typing on their phones. Wrong guesses appear on the board as clues.'
                  : 'Players are typing their guesses on their phones.'}
              </Typography>
            </Box>
          )}
        </Stack>
      </Box>

      <Box sx={{ width: { xs: '100%', md: 300 }, flexShrink: 0 }}>
        <RoundPlayers
          players={playerStatuses}
          currentPlayerId={playerId}
          gameMode={round.gameMode}
          showOthersGuesses={showOthersGuesses}
          roundIndex={round.roundIndex}
        />
      </Box>
    </Stack>
  );
}
