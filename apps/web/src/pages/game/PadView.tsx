import { Box, Stack, Typography } from '@mui/material';
import { TRIVIA_QUESTIONS } from '@wemsic/shared';
import { popIn } from '../../styles/animations';
import { AnswerStatus, McqOptions, TypingInput } from './AnswerControls';
import type { GameViewProps } from './types';
import { useRoundAnswers } from './useRoundAnswers';
import { missedPickNote } from './pickNote';
import { CueingUpSpinner } from './Waiting';

/**
 * Host mode, player phone = answer pad: no stage, no sound, no question
 * visuals — just a timer bar and the controls. The big screen shows the rest.
 */
export function PadView({
  playerId,
  gameMode,
  round,
  reveal,
  timeLeft,
  progress,
  timerExpired,
  myBothCorrect,
  triviaLocked,
  typingHint,
}: GameViewProps) {
  const answers = useRoundAnswers(round?.roundIndex, timerExpired);

  if (reveal) {
    const score = reveal.roundScores[playerId] ?? 0;
    return (
      <PadRoundScore
        score={score}
        pickNote={missedPickNote(gameMode, answers.selectedOption, score)}
      />
    );
  }
  if (!round) return <CueingUpSpinner />;

  const isTyping = round.gameMode === 'typing';
  return (
    <Stack spacing={2.5}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
        }}
      >
        <Typography variant="overline" color="text.secondary">
          Round {round.roundIndex + 1} of {round.totalRounds}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Listen to the host screen
        </Typography>
      </Box>
      {round.trivia && (
        <Typography variant="h5" component="h2" sx={{ lineHeight: 1.2 }}>
          {TRIVIA_QUESTIONS[round.trivia]}
        </Typography>
      )}
      <Box
        sx={{
          height: 8,
          borderRadius: 999,
          bgcolor: 'rgba(20,33,63,0.08)',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            height: '100%',
            width: `${progress}%`,
            borderRadius: 999,
            background:
              timeLeft <= 5000
                ? 'linear-gradient(90deg, #FF7849, #FFB020)'
                : 'linear-gradient(90deg, #16C79A, #2DB7FF)',
            transition: 'width 100ms linear',
          }}
        />
      </Box>

      <AnswerStatus
        isTyping={isTyping}
        mcqAnswered={answers.mcqAnswered}
        myBothCorrect={myBothCorrect}
        trivia={round.trivia}
        triviaLocked={triviaLocked}
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
          disabled={timerExpired || triviaLocked}
          trivia={round.trivia}
          hint={typingHint}
          containerRef={answers.typingChatRef}
        />
      )}
    </Stack>
  );
}

/** Between rounds on a pad: just this player's points; the answer is on the big screen. */
function PadRoundScore({ score, pickNote }: { score: number; pickNote: string | null }) {
  const scored = score > 0;
  return (
    <Stack spacing={2.5} alignItems="center" sx={{ py: { xs: 4, sm: 8 } }}>
      <Box
        sx={{
          width: '100%',
          maxWidth: 420,
          textAlign: 'center',
          borderRadius: '28px',
          p: { xs: 3, sm: 4 },
          color: '#fff',
          background: scored
            ? 'linear-gradient(135deg, #0E7A5B 0%, #16C79A 100%)'
            : 'linear-gradient(135deg, #0E1A3C 0%, #2A3F9E 100%)',
          boxShadow: '0 30px 60px -30px rgba(14,26,60,0.75)',
          animation: `${popIn} 0.5s cubic-bezier(0.16,1,0.3,1)`,
        }}
      >
        <Typography variant="overline" sx={{ opacity: 0.8 }}>
          {scored ? 'Nice one' : 'This round'}
        </Typography>
        <Typography variant="h3" sx={{ color: '#fff', my: 1 }}>
          {scored ? `+${score}` : 'No points'}
        </Typography>
        <Typography sx={{ opacity: 0.9 }}>
          {scored ? 'points' : (pickNote ?? 'Better luck next track')}
        </Typography>
      </Box>
      <Typography color="text.secondary" sx={{ textAlign: 'center' }}>
        Look at the big screen for the answer and the leaderboard.
      </Typography>
    </Stack>
  );
}
