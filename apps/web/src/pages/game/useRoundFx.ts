import type { RoundPlayerStatus, RoundRevealPayload } from '@wemsic/shared';
import { useEffect, useRef } from 'react';
import { revealOutcome, tickSecond } from '../../audio/fx';
import { useGameFx } from '../../audio/useGameFx';

/** How long after the reveal sting your own right/missed buzz comes in. */
const OUTCOME_DELAY_MS = 650;

/**
 * The sounds and buzzes of a round: a beat each second in the last five,
 * a note on the big screen each time someone answers, then the reveal and
 * a buzz for whether you scored.
 */
export function useRoundFx({
  roundIndex,
  timeLeft,
  playing,
  playerStatuses,
  reveal,
  playerId,
}: {
  roundIndex: number | undefined;
  timeLeft: number;
  /** A round is on and not yet revealed. */
  playing: boolean;
  playerStatuses: RoundPlayerStatus[];
  reveal: RoundRevealPayload | null;
  playerId: string | undefined;
}) {
  const fx = useGameFx();
  const fxRef = useRef(fx);
  fxRef.current = fx;

  // Last five seconds.
  const lastTime = useRef<number | null>(null);
  useEffect(() => {
    lastTime.current = null;
  }, [roundIndex]);
  useEffect(() => {
    if (!playing) {
      lastTime.current = null;
      return;
    }
    const second = tickSecond(lastTime.current, timeLeft);
    lastTime.current = timeLeft;
    if (second !== null) fxRef.current('tick', second);
  }, [timeLeft, playing]);

  // Someone answered (only the big screen plays these).
  const answered = playerStatuses.filter((p) => p.done || p.bothCorrect).length;
  const lastAnswered = useRef<{ round: number | undefined; count: number }>({ round: undefined, count: 0 });
  useEffect(() => {
    const last = lastAnswered.current;
    if (last.round !== roundIndex) {
      // A new round (or arriving mid-round): start counting from here.
      lastAnswered.current = { round: roundIndex, count: answered };
      return;
    }
    if (playing && answered > last.count) fxRef.current('someone', answered);
    last.count = answered;
  }, [answered, roundIndex, playing]);

  // The reveal, then whether you scored.
  const revealedRound = useRef<number | null>(null);
  useEffect(() => {
    if (!reveal || revealedRound.current === reveal.roundIndex) return;
    revealedRound.current = reveal.roundIndex;
    fxRef.current('reveal');
    const outcome = playerId ? revealOutcome(reveal.roundScores, playerId) : null;
    if (!outcome) return;
    // Right or missed is just a buzz: the song is playing again by then, and a
    // typed answer already got its "right" sound the moment it went in.
    const id = setTimeout(() => fxRef.current(outcome, undefined, { buzzOnly: true }), OUTCOME_DELAY_MS);
    return () => clearTimeout(id);
  }, [reveal, playerId]);
}
