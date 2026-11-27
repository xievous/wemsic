import { describe, expect, it } from 'vitest';
import { fxPlan, revealOutcome, tickSecond } from './fx';

describe('fxPlan', () => {
  it('the big screen plays the room-wide moments and never buzzes', () => {
    expect(fxPlan('someone', 'screen')).toEqual({ sound: true, buzz: null });
    expect(fxPlan('lockIn', 'screen')).toEqual({ sound: false, buzz: null });
  });

  it('host-mode phones only buzz, and online players get both', () => {
    expect(fxPlan('correct', 'pad')).toEqual({ sound: false, buzz: 'correct' });
    expect(fxPlan('correct', 'player')).toEqual({ sound: true, buzz: 'correct' });
    expect(fxPlan('someone', 'player')).toEqual({ sound: false, buzz: null });
  });
});

describe('tickSecond', () => {
  it('beats once for each of the last five seconds', () => {
    const beats: number[] = [];
    let previous: number | null = null;
    for (let ms = 8000; ms >= 0; ms -= 100) {
      const second = tickSecond(previous, ms);
      if (second !== null) beats.push(second);
      previous = ms;
    }
    expect(beats).toEqual([5, 4, 3, 2, 1]);
  });

  it("doesn't beat when you arrive mid-countdown or the clock jumps back up", () => {
    expect(tickSecond(null, 3200)).toBeNull();
    expect(tickSecond(2100, 4100)).toBeNull();
  });
});

describe('revealOutcome', () => {
  it('says whether you scored, and nothing for the big screen', () => {
    const scores = { a: 640, b: 0 };
    expect(revealOutcome(scores, 'a')).toBe('correct');
    expect(revealOutcome(scores, 'b')).toBe('wrong');
    expect(revealOutcome(scores, 'screen')).toBeNull();
  });
});
