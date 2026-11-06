import type {
  GameMode,
  RoundPlayerStatus,
  RoundRevealPayload,
  RoundStartPayload,
} from '@wemsic/shared';

/** Round state the Game page derives once and hands to whichever view renders. */
export interface GameViewProps {
  playerId: string;
  /** Seeds Eko's dance order, so everyone in the room sees the same moves. */
  roomCode: string;
  /** From the room settings, which can't change mid-game; set even at the reveal. */
  gameMode: GameMode;
  round: RoundStartPayload | null;
  reveal: RoundRevealPayload | null;
  playerStatuses: RoundPlayerStatus[];
  timeLeft: number;
  /** Remaining round time as a 0–100 percentage. */
  progress: number;
  /** Remaining between-rounds time as a 0–100 percentage. */
  revealProgress: number;
  timerExpired: boolean;
  showOthersGuesses: boolean;
  myBothCorrect: boolean | undefined;
  /** Trivia typing: my answer is final for this round. */
  triviaLocked: boolean;
  /** Why my last typed guess wasn't taken, e.g. it wasn't a year. */
  typingHint: string | null;
}
