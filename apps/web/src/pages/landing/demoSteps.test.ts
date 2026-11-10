import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDemoClock, nextStep } from './demoSteps';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('nextStep', () => {
  it('goes Pick, Play, Guess and back to Pick', () => {
    expect([0, 1, 2].map(nextStep)).toEqual([1, 2, 0]);
  });
});

describe('createDemoClock', () => {
  it('moves on every step and loops', () => {
    const seen: number[] = [];
    const clock = createDemoClock({ onStep: (s) => seen.push(s), auto: true, stepMs: 1000 });
    clock.start();
    vi.advanceTimersByTime(3000);
    expect(seen).toEqual([0, 1, 2, 0]);
    clock.stop();
  });

  it('gives a step it jumped to its full time', () => {
    const seen: number[] = [];
    const clock = createDemoClock({ onStep: (s) => seen.push(s), auto: true, stepMs: 1000 });
    clock.start();
    vi.advanceTimersByTime(900);
    clock.jump(2);
    vi.advanceTimersByTime(900);
    expect(seen).toEqual([0, 2]);
    vi.advanceTimersByTime(100);
    expect(seen).toEqual([0, 2, 0]);
    clock.stop();
  });

  it('stays put with reduced motion, but still jumps', () => {
    const seen: number[] = [];
    const clock = createDemoClock({ onStep: (s) => seen.push(s), auto: false, stepMs: 1000 });
    clock.start();
    vi.advanceTimersByTime(5000);
    clock.jump(1);
    vi.advanceTimersByTime(5000);
    expect(seen).toEqual([0, 1]);
  });

  it('holds while paused and carries on after', () => {
    const seen: number[] = [];
    const clock = createDemoClock({ onStep: (s) => seen.push(s), auto: true, stepMs: 1000 });
    clock.start();
    clock.setPaused(true);
    vi.advanceTimersByTime(5000);
    expect(seen).toEqual([0]);
    clock.setPaused(false);
    vi.advanceTimersByTime(1000);
    expect(seen).toEqual([0, 1]);
    clock.stop();
  });
});
