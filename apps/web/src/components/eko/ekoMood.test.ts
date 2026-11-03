import { describe, expect, it } from 'vitest';
import { danceMove, GAME_MOVES, revealMood, roundFace } from './ekoMood';

describe('danceMove', () => {
  it('is the same for everyone in a room, whatever the code casing', () => {
    expect(danceMove('k7q2mx', 3, 'round')).toBe(danceMove('K7Q2MX', 3, 'round'));
  });

  it('changes at every step of the game', () => {
    const steps = Array.from({ length: 20 }, (_, r) => [
      danceMove('K7Q2MX', r, 'round'),
      danceMove('K7Q2MX', r, 'reveal'),
    ]).flat();
    for (let i = 1; i < steps.length; i += 1) expect(steps[i]).not.toBe(steps[i - 1]);
  });

  it('uses every game move before repeating', () => {
    const first = Array.from({ length: 4 }, (_, r) => [
      danceMove('ABCDEF', r, 'round'),
      danceMove('ABCDEF', r, 'reveal'),
    ])
      .flat()
      .slice(0, GAME_MOVES.length);
    expect(new Set(first).size).toBe(GAME_MOVES.length);
  });

  it('dances differently in different rooms', () => {
    const order = (code: string) =>
      Array.from({ length: 7 }, (_, r) => danceMove(code, r, 'round')).join();
    expect(order('ABCDEF')).not.toBe(order('ZXYWVU'));
  });
});

describe('roundFace', () => {
  const base = { timeLeft: 20000, typing: false, soundOn: true };

  it('is happy while the song plays', () => {
    expect(roundFace(base)).toBe('happy');
  });

  it('concentrates in typing rounds', () => {
    expect(roundFace({ ...base, typing: true })).toBe('focused');
  });

  it('panics in the last five seconds', () => {
    expect(roundFace({ ...base, timeLeft: 5000, typing: true })).toBe('whoa');
  });

  it('waits calmly once time is up', () => {
    expect(roundFace({ ...base, timeLeft: 0 })).toBe('neutral');
  });

  it('dozes off when sound is off, whatever else is going on', () => {
    expect(roundFace({ ...base, timeLeft: 3000, soundOn: false })).toBe('sleepy');
  });
});

describe('revealMood', () => {
  it('celebrates your points with the reveal dance', () => {
    expect(revealMood('ABCDEF', 2, 120, false)).toEqual({
      face: 'starry',
      move: danceMove('ABCDEF', 2, 'reveal'),
    });
  });

  it('slumps when you missed', () => {
    expect(revealMood('ABCDEF', 2, 0, false)).toEqual({ face: 'oops', move: 'slump' });
  });

  it('always celebrates on the host screen', () => {
    expect(revealMood('ABCDEF', 2, 0, true).face).toBe('starry');
  });
});
