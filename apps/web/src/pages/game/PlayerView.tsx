import { Box, Stack } from '@mui/material';
import { RoundPlayers } from '../../components/RoundPlayers';
import { AnswerStatus, McqOptions, TypingInput } from './AnswerControls';
import { RoundReveal } from './RoundReveal';
import { Stage } from './Stage';
import type { GameViewProps } from './types';
import { useRoundAnswers } from './useRoundAnswers';
import { missedPickNote } from './pickNote';
import { CueingUpSpinner } from './Waiting';

/** Online mode: every device gets the stage, sound, and its own answer controls. */
export function PlayerView({
  playerId,
  roomCode,
  gameMode,
  round,
  reveal,
  playerStatuses,
  timeLeft,
  progress,
  revealProgress,
  timerExpired,
  showOthersGuesses,
  myBothCorrect,
}: GameViewProps) {
  const answers = useRoundAnswers(round?.roundIndex, timerExpired);

  if (reveal) {
    return (
      <RoundReveal
        roomCode={roomCode}
        reveal={reveal}
        playerId={playerId}
        revealProgress={revealProgress}
        pickNote={missedPickNote(
          gameMode,
          answers.selectedOption,
          reveal.roundScores[playerId] ?? 0,
        )}
      />
    );
  }
  if (!round) return <CueingUpSpinner />;

  const isTyping = round.gameMode === 'typing';
  return (
    <Stack spacing={2.5} direction={{ xs: 'column', md: 'row' }} alignItems="flex-start">
      <Box sx={{ flex: 1, minWidth: 0, width: '100%' }}>
        <Stack spacing={2.5}>
          <Stage
            roomCode={roomCode}
            roundIndex={round.roundIndex}
            totalRounds={round.totalRounds}
            timeLeft={timeLeft}
            progress={progress}
            typing={isTyping}
          />

          <AnswerStatus
            isTyping={isTyping}
            mcqAnswered={answers.mcqAnswered}
            myBothCorrect={myBothCorrect}
          />

          {round.gameMode === 'speed_choice' && round.options && (
            <McqOptions
              options={round.options}
              selectedOption={answers.selectedOption}
              answered={answers.mcqAnswered}
              onSelect={answers.selectOption}
            />
          )}
          {isTyping && (
            <TypingInput
              guess={answers.guess}
              onGuessChange={answers.setGuess}
              onSubmit={answers.submitGuess}
              disabled={timerExpired}
              containerRef={answers.typingChatRef}
            />
          )}
        </Stack>
      </Box>

      <Box sx={{ width: { xs: '100%', md: 280 }, flexShrink: 0 }}>
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
