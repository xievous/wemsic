import { Box, Stack, Typography } from '@mui/material';
import { TRIVIA_QUESTIONS } from '@wemsic/shared';
import { RoundPlayers } from '../../components/RoundPlayers';
import { PresenterOptions } from './AnswerControls';
import { RoundLayout } from './RoundLayout';
import { RoundReveal } from './RoundReveal';
import { Stage } from './Stage';
import type { GameViewProps } from './types';
import { PresenterWaitingStage } from './Waiting';

/** Host mode, shared screen: big question + sound, read-only answers, no input. */
export function PresenterView({
  playerId,
  roomCode,
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
        roomCode={roomCode}
        reveal={reveal}
        playerId={playerId}
        revealProgress={revealProgress}
        presenter
      />
    );
  }
  if (!round) return <PresenterWaitingStage />;

  return (
    <RoundLayout
      presenter
      game={
        <Stack spacing={3}>
          <Stage
            roomCode={roomCode}
            roundIndex={round.roundIndex}
            totalRounds={round.totalRounds}
            timeLeft={timeLeft}
            progress={progress}
            typing={round.gameMode === 'typing'}
            question={round.trivia && TRIVIA_QUESTIONS[round.trivia]}
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
              <Typography variant="h3" gutterBottom>
                {round.trivia ? 'Type your answer' : 'Name that track'}
              </Typography>
              <Typography color="text.secondary" sx={{ fontSize: { xs: '1.1rem', sm: '1.4rem' } }}>
                {showOthersGuesses
                  ? 'Players are typing on their phones. Wrong guesses appear on the board as clues.'
                  : 'Players are typing their guesses on their phones.'}
              </Typography>
            </Box>
          )}
        </Stack>
      }
      players={
        <RoundPlayers
          players={playerStatuses}
          currentPlayerId={playerId}
          gameMode={round.gameMode}
          showOthersGuesses={showOthersGuesses}
          roundIndex={round.roundIndex}
          trivia={round.trivia}
        />
      }
    />
  );
}
