import type { McqOption } from '@wemsic/shared';
import { useEffect, useRef, useState } from 'react';
import { useGameFx } from '../../audio/useGameFx';
import { useSocket } from '../../socket/SocketContext';

function playTypingWrongShake(el: Element) {
  return el.animate(
    [
      { transform: 'translateX(0)' },
      { transform: 'translateX(-8px)' },
      { transform: 'translateX(8px)' },
      { transform: 'translateX(-6px)' },
      { transform: 'translateX(6px)' },
      { transform: 'translateX(0)' },
    ],
    { duration: 450, easing: 'ease' },
  );
}

function playTypingCorrectDing(el: Element) {
  return el.animate(
    [
      {
        transform: 'translateY(0)',
        boxShadow: '0 0 0 0 rgba(46, 204, 113, 0)',
      },
      {
        transform: 'translateY(10px)',
        boxShadow:
          '0 0 0 4px rgba(46, 204, 113, 0.45), 0 0 28px 10px rgba(46, 204, 113, 0.5)',
      },
      {
        transform: 'translateY(-7px)',
        boxShadow:
          '0 0 0 4px rgba(46, 204, 113, 0.3), 0 0 24px 8px rgba(46, 204, 113, 0.4)',
      },
      { transform: 'translateY(3px)' },
      {
        transform: 'translateY(0)',
        boxShadow: '0 0 0 0 rgba(46, 204, 113, 0)',
      },
    ],
    { duration: 650, easing: 'ease', fill: 'none' },
  );
}

/**
 * Local answer state for a competing player (online player or host-mode pad):
 * the locked-in MCQ option, the typing guess draft, and the shake/ding
 * feedback when a typing result comes back. Resets when the next round
 * starts, so the pick is still there to show at the reveal.
 */
export function useRoundAnswers(roundIndex: number | undefined, timerExpired: boolean) {
  const { submitMcqAnswer, submitTypingGuess, lastTypingResult } = useSocket();
  const fx = useGameFx();
  // Read through a ref so toggling effects doesn't re-run the result effect below.
  const fxRef = useRef(fx);
  fxRef.current = fx;
  const [mcqAnswered, setMcqAnswered] = useState(false);
  const [selectedOption, setSelectedOption] = useState<McqOption | null>(null);
  const [guess, setGuess] = useState('');
  const typingChatRef = useRef<HTMLDivElement>(null);
  const typingChatAtSubmitRef = useRef<HTMLDivElement | null>(null);
  const typingAnimRef = useRef<Animation | null>(null);
  const lastResultTs = useRef(0);

  useEffect(() => {
    setMcqAnswered(false);
    setSelectedOption(null);
    setGuess('');
    typingAnimRef.current?.cancel();
  }, [roundIndex]);

  useEffect(() => {
    if (!lastTypingResult) return;
    const ts = Date.now();
    if (ts - lastResultTs.current < 50) return;
    lastResultTs.current = ts;

    const el = typingChatRef.current ?? typingChatAtSubmitRef.current;
    if (!el) return;

    typingAnimRef.current?.cancel();
    // A locked-in year or name stays a secret until the reveal.
    if (lastTypingResult.locked && !lastTypingResult.bothCorrect) return;
    if (lastTypingResult.incorrect) {
      typingAnimRef.current = playTypingWrongShake(el);
      return;
    }

    fxRef.current('correct');
    typingAnimRef.current = playTypingCorrectDing(el);
  }, [lastTypingResult]);

  function selectOption(option: McqOption) {
    if (mcqAnswered) return;
    submitMcqAnswer(option.id);
    fx('lockIn');
    setMcqAnswered(true);
    setSelectedOption(option);
  }

  function submitGuess(e?: React.FormEvent) {
    e?.preventDefault();
    if (timerExpired || !guess.trim()) return;
    typingChatAtSubmitRef.current = typingChatRef.current;
    submitTypingGuess(guess.trim());
    fx('lockIn');
    setGuess('');
  }

  return {
    mcqAnswered,
    selectedOption,
    selectOption,
    guess,
    setGuess,
    submitGuess,
    typingChatRef,
  };
}
