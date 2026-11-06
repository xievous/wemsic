import type { TriviaKind } from '@wemsic/shared';
import { describe, expect, it, vi } from 'vitest';
import type { TrackFacts } from '../itunes/facts.js';
import { makeTrack, makeTracks } from '../test/fixtures.js';
import { pickTriviaQuestion, type Contributor } from './trivia.js';

const pool = [...makeTracks('p1', 10), ...makeTracks('p2', 10), ...makeTracks('p3', 10)];
const track = pool[0]!;
const three: Contributor[] = [
  { playerId: 'p1', displayName: 'Sam' },
  { playerId: 'p2', displayName: 'Alex' },
  { playerId: 'p3', displayName: 'Jo' },
];
const rumours: TrackFacts = {
  album: 'Rumours',
  year: 1977,
  otherAlbums: ['Tusk', 'Mirage', 'Tango in the Night'],
};

/** Asks every question many times over and lists the kinds that came up. */
async function kindsAsked(options: Partial<Parameters<typeof pickTriviaQuestion>[0]> = {}) {
  const kinds = new Set<TriviaKind>();
  for (let i = 0; i < 60; i++) {
    const q = await pickTriviaQuestion({
      track,
      pool,
      contributors: three,
      previousKind: null,
      choices: true,
      facts: async () => rumours,
      ...options,
    });
    kinds.add(q.kind);
  }
  return kinds;
}

describe('pickTriviaQuestion', () => {
  it('asks all five kinds when the song has the facts and three people added songs', async () => {
    expect(await kindsAsked()).toEqual(new Set(['title', 'artist', 'album', 'year', 'added_by']));
  });

  it('only asks who added the song when at least three people did', async () => {
    expect(await kindsAsked({ contributors: three.slice(0, 2) })).not.toContain('added_by');
  });

  it('skips album and year when they are unknown', async () => {
    const kinds = await kindsAsked({ facts: async () => ({ album: null, year: null, otherAlbums: [] }) });
    expect(kinds).toEqual(new Set(['title', 'artist', 'added_by']));
  });

  it('needs three wrong albums for speed choice, but none for typing', async () => {
    const facts = async () => ({ ...rumours, otherAlbums: ['Tusk'] });
    expect(await kindsAsked({ facts })).not.toContain('album');
    expect(await kindsAsked({ facts, choices: false })).toContain('album');
  });

  it('only looks up facts when album or year comes up', async () => {
    const facts = vi.fn(async () => rumours);
    // random() = 0 shuffles the kinds into [artist, album, year, added_by, title].
    await pickTriviaQuestion({ track, pool, contributors: three, previousKind: null, choices: true, facts, random: () => 0 });
    expect(facts).not.toHaveBeenCalled();
  });

  it("doesn't repeat the last kind while another fits", async () => {
    const kinds = await kindsAsked({ previousKind: 'title' });
    expect(kinds).not.toContain('title');
  });

  it('builds the answer and three wrong options', async () => {
    const q = await pickTriviaQuestion({
      track,
      pool,
      contributors: three,
      previousKind: null,
      choices: true,
      facts: async () => rumours,
      random: () => 0.999,
    });
    expect(q.wrong).toHaveLength(3);
    expect(q.wrong).not.toContain(q.answer);
  });

  it('offers nearby years, none in the future', async () => {
    const thisYear = new Date().getFullYear();
    for (let i = 0; i < 20; i++) {
      const q = await pickTriviaQuestion({
        track: makeTrack('new', 'p1'),
        pool,
        contributors: [],
        previousKind: null,
        choices: true,
        facts: async () => ({ album: null, year: thisYear, otherAlbums: [] }),
        random: Math.random,
      });
      if (q.kind !== 'year') continue;
      for (const y of q.wrong.map(Number)) {
        expect(y).toBeLessThanOrEqual(thisYear);
        expect(Math.abs(y - thisYear)).toBeLessThanOrEqual(6);
      }
    }
  });
});
