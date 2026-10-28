import { afterEach, describe, expect, it, vi } from 'vitest';
import { makeTrack, makeTracks } from '../test/fixtures.js';
import { TrackPool } from './TrackPool.js';

afterEach(() => {
  vi.restoreAllMocks();
});

function drain(pool: TrackPool) {
  const picks = [];
  for (let t = pool.pickNext(); t; t = pool.pickNext()) picks.push(t);
  return picks;
}

describe('TrackPool', () => {
  it('alternates fairly between contributors', () => {
    const pool = new TrackPool([...makeTracks('a', 10), ...makeTracks('b', 10)]);
    const firstTen = Array.from({ length: 10 }, () => pool.pickNext()!.contributedBy);
    expect(firstTen.filter((c) => c === 'a')).toHaveLength(5);
    expect(firstTen.filter((c) => c === 'b')).toHaveLength(5);
  });

  it('keeps drawing from a bigger library once a smaller one runs out', () => {
    const pool = new TrackPool([...makeTracks('a', 2), ...makeTracks('b', 6)]);
    const picks = drain(pool);
    expect(picks).toHaveLength(8);
    expect(picks.slice(-4).every((t) => t.contributedBy === 'b')).toBe(true);
  });

  it('never repeats a track, even one shared by two contributors', () => {
    const shared = 'same-id';
    const pool = new TrackPool([
      makeTrack(shared, 'a'),
      makeTrack(shared, 'b'),
      ...makeTracks('a', 3),
      ...makeTracks('b', 3),
    ]);
    const ids = drain(pool).map((t) => t.spotifyTrackId);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.filter((id) => id === shared)).toHaveLength(1);
  });

  it('dedupes repeats within one contributor', () => {
    const pool = new TrackPool([makeTrack('x', 'a'), makeTrack('x', 'a'), makeTrack('y', 'a')]);
    expect(pool.getAllTracks()).toHaveLength(2);
  });

  it('returns null when empty', () => {
    expect(new TrackPool([]).pickNext()).toBeNull();
  });

  it('refunds the rotation credit when a pick turns out unplayable', () => {
    // Math.random() = 0 makes every tie-break pick the first candidate (a).
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const pool = new TrackPool([...makeTracks('a', 3), ...makeTracks('b', 3)]);

    const first = pool.pickNext()!;
    expect(first.contributedBy).toBe('a');
    pool.markUnplayable(first.spotifyTrackId);

    // a's credit was refunded, so a and b are tied again and a goes next.
    // Without the refund, b would be owed the next pick.
    const second = pool.pickNext()!;
    expect(second.contributedBy).toBe('a');
    expect(second.spotifyTrackId).not.toBe(first.spotifyTrackId);
  });
});
