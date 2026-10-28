import {
  ALL_ANSWERED_REVEAL_DELAY_MS,
  BETWEEN_ROUNDS_DELAY_MS,
  MIN_ROUND_PLAY_MS,
} from '@wemsic/shared';
import type {
  GameMode,
  NormalizedTrack,
  RoundProgressPayload,
  RoundRevealPayload,
  RoundStartPayload,
} from '@wemsic/shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resolvePreviewUrl } from '../deezer/preview.js';
import { makeTrack, makeTracks, previewFor, titleFromPreview } from '../test/fixtures.js';
import { GameEngine } from './GameEngine.js';

vi.mock('../deezer/preview.js', () => ({
  resolvePreviewUrl: vi.fn(async () => null),
}));

const SPEED_MS = 15_000;
const TYPING_MS = 30_000;

type Event =
  | { type: 'start'; payload: RoundStartPayload }
  | { type: 'reveal'; payload: RoundRevealPayload }
  | { type: 'end'; payload: RoundRevealPayload['leaderboard'] };

function setup({
  tracks,
  mode = 'speed_choice',
  rounds = 3,
  durationMs = mode === 'typing' ? TYPING_MS : SPEED_MS,
  players = ['p1', 'p2'],
}: {
  tracks: NormalizedTrack[];
  mode?: GameMode;
  rounds?: number;
  durationMs?: number;
  players?: string[];
}) {
  const events: Event[] = [];
  const progress: RoundProgressPayload[] = [];
  const engine = new GameEngine(tracks, mode, rounds, durationMs, players, 'normal', false, {
    onRoundStart: (payload) => events.push({ type: 'start', payload }),
    onRoundProgress: (payload) => progress.push(payload),
    onRoundReveal: (payload) => events.push({ type: 'reveal', payload }),
    onGameEnd: (payload) => events.push({ type: 'end', payload }),
  });
  engine.setDisplayNames(new Map(players.map((id) => [id, id.toUpperCase()])));

  const last = <T extends Event['type']>(type: T) =>
    events.filter((e) => e.type === type).at(-1)?.payload as Extract<Event, { type: T }>['payload'];

  return { engine, events, progress, last };
}

/** The option whose label is the title of the track this round is playing. */
function correctOption(round: RoundStartPayload): string {
  const title = titleFromPreview(round.previewUrl);
  return round.options!.find((o) => o.label === title)!.id;
}

function wrongOption(round: RoundStartPayload): string {
  return round.options!.find((o) => o.id !== correctOption(round))!.id;
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.mocked(resolvePreviewUrl).mockReset().mockResolvedValue(null);
});

describe('GameEngine: round flow', () => {
  it('plays every round, revealing each, then ends', async () => {
    const { engine, events } = setup({ tracks: makeTracks('p1', 10), rounds: 3 });
    await engine.start();
    await vi.advanceTimersByTimeAsync(3 * (SPEED_MS + BETWEEN_ROUNDS_DELAY_MS));

    expect(events.map((e) => e.type)).toEqual([
      'start', 'reveal', 'start', 'reveal', 'start', 'reveal', 'end',
    ]);
    const starts = events.filter((e) => e.type === 'start').map((e) => e.payload.roundIndex);
    expect(starts).toEqual([0, 1, 2]);
  });

  it('reveals at the round timer when nobody answers', async () => {
    const { engine, events } = setup({ tracks: makeTracks('p1', 10) });
    await engine.start();

    await vi.advanceTimersByTimeAsync(SPEED_MS - 1);
    expect(events.map((e) => e.type)).toEqual(['start']);
    await vi.advanceTimersByTimeAsync(1);
    expect(events.map((e) => e.type)).toEqual(['start', 'reveal']);
  });

  it('ends early when the track pool runs out', async () => {
    const { engine, events } = setup({ tracks: makeTracks('p1', 2), rounds: 5 });
    await engine.start();
    await vi.advanceTimersByTimeAsync(5 * (SPEED_MS + BETWEEN_ROUNDS_DELAY_MS));

    expect(events.filter((e) => e.type === 'start')).toHaveLength(2);
    expect(events.at(-1)?.type).toBe('end');
  });

  it('falls back to the preview lookup for tracks without a preview', async () => {
    vi.mocked(resolvePreviewUrl).mockResolvedValue(previewFor('Song p1-1'));
    const tracks = [makeTrack('p1-1', 'p1', { previewUrl: null })];
    const { engine, last } = setup({ tracks, mode: 'typing', rounds: 1 });
    await engine.start();

    expect(resolvePreviewUrl).toHaveBeenCalledWith('Artist p1-1', 'Song p1-1');
    expect(last('start').previewUrl).toBe(previewFor('Song p1-1'));
  });

  it('ends immediately when no track has a preview', async () => {
    const tracks = makeTracks('p1', 5).map((t) => ({ ...t, previewUrl: null }));
    const { engine, events } = setup({ tracks });
    await engine.start();

    expect(events.map((e) => e.type)).toEqual(['end']);
    expect(resolvePreviewUrl).toHaveBeenCalledTimes(5);
  });

  // Known bug: destroy() only clears the round timer, not the between-rounds
  // or early-reveal timeouts, so a destroyed engine keeps playing. Flip to
  // `it` once fixed.
  it.fails('stops scheduling rounds once destroyed', async () => {
    const { engine, events } = setup({ tracks: makeTracks('p1', 10) });
    await engine.start();
    await vi.advanceTimersByTimeAsync(SPEED_MS);
    expect(events.at(-1)?.type).toBe('reveal');

    engine.destroy();
    await vi.advanceTimersByTimeAsync(BETWEEN_ROUNDS_DELAY_MS + SPEED_MS);
    expect(events.filter((e) => e.type === 'start')).toHaveLength(1);
  });
});

describe('GameEngine: speed choice', () => {
  it('offers four options with exactly one correct title', async () => {
    const { engine, last } = setup({ tracks: makeTracks('p1', 10) });
    await engine.start();
    const round = last('start');

    expect(round.options).toHaveLength(4);
    const title = titleFromPreview(round.previewUrl);
    expect(round.options!.filter((o) => o.label === title)).toHaveLength(1);
  });

  it('scores a correct answer and gives nothing for a wrong one', async () => {
    const { engine, last } = setup({ tracks: makeTracks('p1', 10) });
    await engine.start();
    const round = last('start');

    expect(engine.submitMcqAnswer('p1', correctOption(round))).toBe(true);
    expect(engine.submitMcqAnswer('p2', wrongOption(round))).toBe(true);
    await vi.advanceTimersByTimeAsync(ALL_ANSWERED_REVEAL_DELAY_MS);

    const reveal = last('reveal');
    expect(reveal.roundScores.p1).toBeGreaterThan(0);
    expect(reveal.roundScores.p2).toBe(0);
    expect(reveal.leaderboard[0]).toMatchObject({ playerId: 'p1', displayName: 'P1' });
  });

  it('scores a faster correct answer higher', async () => {
    const { engine, last } = setup({ tracks: makeTracks('p1', 10) });
    await engine.start();
    const round = last('start');

    engine.submitMcqAnswer('p1', correctOption(round));
    await vi.advanceTimersByTimeAsync(3_000);
    engine.submitMcqAnswer('p2', correctOption(round));
    await vi.advanceTimersByTimeAsync(ALL_ANSWERED_REVEAL_DELAY_MS);

    const { roundScores } = last('reveal');
    expect(roundScores.p1).toBeGreaterThan(roundScores.p2!);
  });

  it('accepts only one answer per player per round', async () => {
    const { engine, last } = setup({ tracks: makeTracks('p1', 10) });
    await engine.start();
    const round = last('start');

    expect(engine.submitMcqAnswer('p1', wrongOption(round))).toBe(true);
    expect(engine.submitMcqAnswer('p1', correctOption(round))).toBe(false);
  });

  it('reveals early once everyone has answered', async () => {
    const { engine, events, last } = setup({ tracks: makeTracks('p1', 10) });
    await engine.start();
    const round = last('start');

    engine.submitMcqAnswer('p1', correctOption(round));
    engine.submitMcqAnswer('p2', correctOption(round));
    await vi.advanceTimersByTimeAsync(ALL_ANSWERED_REVEAL_DELAY_MS);

    expect(events.map((e) => e.type)).toEqual(['start', 'reveal']);
  });

  it('shortens the timer when someone answers, but not below the minimum play time', async () => {
    const { engine, progress, last } = setup({
      tracks: makeTracks('p1', 10),
      players: ['p1', 'p2', 'p3'],
    });
    await engine.start();
    const round = last('start');

    engine.submitMcqAnswer('p1', correctOption(round));
    const afterOne = progress.at(-1)!.roundEndsAt;
    expect(afterOne).toBeLessThan(round.roundEndsAt);

    engine.submitMcqAnswer('p2', correctOption(round));
    const afterTwo = progress.at(-1)!.roundEndsAt;
    expect(afterTwo).toBeLessThanOrEqual(afterOne);
    expect(afterTwo).toBeGreaterThanOrEqual(round.roundEndsAt - SPEED_MS + MIN_ROUND_PLAY_MS);
  });

  it('rejects answers after the round has ended', async () => {
    const { engine, last } = setup({ tracks: makeTracks('p1', 10) });
    await engine.start();
    const round = last('start');

    await vi.advanceTimersByTimeAsync(SPEED_MS);
    expect(engine.submitMcqAnswer('p1', correctOption(round))).toBe(false);
  });
});

describe('GameEngine: typing', () => {
  const tracks = [makeTrack('t1', 'p1', { title: 'Get Lucky', artists: ['Daft Punk'] })];

  it('scores both parts above one part, and nothing for no part', async () => {
    const { engine, last } = setup({ tracks, mode: 'typing', rounds: 1, players: ['p1', 'p2', 'p3'] });
    await engine.start();

    expect(engine.submitTypingGuess('p1', 'daft punk get lucky')).toMatchObject({
      incorrect: false,
      bothCorrect: true,
    });
    expect(engine.submitTypingGuess('p2', 'daft punk')).toMatchObject({
      incorrect: false,
      artistCorrect: true,
      titleCorrect: false,
    });
    expect(engine.submitTypingGuess('p3', 'never gonna give you up')).toMatchObject({
      incorrect: true,
    });
    await vi.advanceTimersByTimeAsync(TYPING_MS);

    const { roundScores } = last('reveal');
    expect(roundScores.p1).toBeGreaterThan(roundScores.p2!);
    expect(roundScores.p2).toBeGreaterThan(0);
    expect(roundScores.p3).toBe(0);
  });

  it('keeps earlier correct parts across guesses', async () => {
    const { engine } = setup({ tracks, mode: 'typing', rounds: 1 });
    await engine.start();

    engine.submitTypingGuess('p1', 'daft punk');
    expect(engine.submitTypingGuess('p1', 'get lucky')).toMatchObject({
      artistCorrect: true,
      titleCorrect: true,
      bothCorrect: true,
    });
  });

  it('reveals early once everyone has both parts', async () => {
    const { engine, events } = setup({ tracks, mode: 'typing', rounds: 1 });
    await engine.start();

    engine.submitTypingGuess('p1', 'daft punk get lucky');
    engine.submitTypingGuess('p2', 'get lucky by daft punk');
    await vi.advanceTimersByTimeAsync(ALL_ANSWERED_REVEAL_DELAY_MS);

    expect(events.map((e) => e.type)).toEqual(['start', 'reveal']);
  });

  it('ignores guesses outside a typing round', async () => {
    const { engine } = setup({ tracks: makeTracks('p1', 10) });
    await engine.start();
    expect(engine.submitTypingGuess('p1', 'anything')).toMatchObject({ incorrect: true });
  });
});
