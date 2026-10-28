import type {
  RoundPlayerStatus,
  RoundRevealPayload,
  RoundStartPayload,
} from '@wemsic/shared';

/** Round state the Game page derives once and hands to whichever view renders. */
export interface GameViewProps {
  playerId: string;
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
}
