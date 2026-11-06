import {
  MCQ_OPTION_COUNT,
  TRIVIA_MIN_CONTRIBUTORS,
  normalizeAnswer,
  stripTitleQualifiers,
} from '@wemsic/shared';
import type { NormalizedTrack, TriviaKind } from '@wemsic/shared';
import type { TrackFacts } from '../itunes/facts.js';

export interface Contributor {
  playerId: string;
  displayName: string;
}

/** One trivia round's question, its answer, and its wrong answers for speed choice. */
export interface TriviaQuestion {
  kind: TriviaKind;
  /** The answer as shown on the reveal and on the correct option. */
  answer: string;
  /** Wrong options for speed choice; empty when typing. */
  wrong: string[];
  /** Year questions: list the options in order rather than shuffled. */
  sortOptions?: boolean;
  /** Typing answers: the album to match, the year, or who added the song. */
  album?: string;
  year?: number;
  addedBy?: Contributor;
}

const WRONG_COUNT = MCQ_OPTION_COUNT - 1;
const KINDS: TriviaKind[] = ['title', 'artist', 'album', 'year', 'added_by'];

/**
 * Picks a question this song can answer. Kinds are tried in random order, the
 * last round's kind last, so the same question rarely comes twice in a row.
 * Album and year facts are only looked up when one of them comes up. Every
 * song can at least be asked for its title.
 */
export async function pickTriviaQuestion({
  track,
  pool,
  contributors,
  previousKind,
  choices,
  facts: loadFacts,
  random = Math.random,
}: {
  track: NormalizedTrack;
  /** Every song in the game, for wrong titles and artists. */
  pool: NormalizedTrack[];
  /** Everyone with songs in the game. */
  contributors: Contributor[];
  previousKind: TriviaKind | null;
  /** Speed choice needs enough wrong answers to fill the options. */
  choices: boolean;
  facts: () => Promise<TrackFacts>;
  random?: () => number;
}): Promise<TriviaQuestion> {
  const order = shuffled(KINDS, random).sort(
    (a, b) => Number(a === previousKind) - Number(b === previousKind),
  );
  let facts: TrackFacts | null = null;

  for (const kind of order) {
    if ((kind === 'album' || kind === 'year') && !facts) facts = await loadFacts();
    const question = askable(kind, track, pool, contributors, facts, choices, random);
    if (question) return question;
  }
  return askable('title', track, pool, contributors, facts, false, random)!;
}

function askable(
  kind: TriviaKind,
  track: NormalizedTrack,
  pool: NormalizedTrack[],
  contributors: Contributor[],
  facts: TrackFacts | null,
  choices: boolean,
  random: () => number,
): TriviaQuestion | null {
  const enough = (wrong: string[]) => !choices || wrong.length >= WRONG_COUNT;
  const pick = (wrong: string[]) => (choices ? shuffled(wrong, random).slice(0, WRONG_COUNT) : []);

  switch (kind) {
    case 'title': {
      const answer = stripTitleQualifiers(track.title) || track.title;
      const wrong = distinct(
        pool.map((t) => stripTitleQualifiers(t.title) || t.title),
        [answer],
      );
      return enough(wrong) ? { kind, answer, wrong: pick(wrong) } : null;
    }
    case 'artist': {
      const answer = track.artists[0];
      if (!answer) return null;
      const wrong = distinct(
        pool.map((t) => t.artists[0] ?? ''),
        track.artists,
      );
      return enough(wrong) ? { kind, answer, wrong: pick(wrong) } : null;
    }
    case 'album': {
      if (!facts?.album) return null;
      const wrong = distinct(facts.otherAlbums, [facts.album]);
      return enough(wrong)
        ? { kind, answer: facts.album, album: facts.album, wrong: pick(wrong) }
        : null;
    }
    case 'year': {
      if (!facts?.year) return null;
      const year = facts.year;
      return {
        kind,
        answer: String(year),
        year,
        wrong: choices ? nearbyYears(year, random).map(String) : [],
        sortOptions: true,
      };
    }
    case 'added_by': {
      if (contributors.length < TRIVIA_MIN_CONTRIBUTORS) return null;
      const addedBy = contributors.find((c) => c.playerId === track.contributedBy);
      if (!addedBy) return null;
      const others = contributors.filter((c) => c !== addedBy).map((c) => c.displayName);
      return { kind, answer: addedBy.displayName, addedBy, wrong: pick(others) };
    }
  }
}

/** Three other years within six of the answer, none in the future. */
function nearbyYears(year: number, random: () => number): number[] {
  const latest = new Date().getFullYear();
  const offsets = [-6, -5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6].filter((d) => year + d <= latest);
  return shuffled(offsets, random)
    .slice(0, WRONG_COUNT)
    .map((d) => year + d);
}

/** Labels that differ from each other and from every excluded one, ignoring case and accents. */
function distinct(labels: string[], exclude: string[]): string[] {
  const seen = new Set(exclude.map(normalizeAnswer));
  const out: string[] = [];
  for (const label of labels) {
    const key = normalizeAnswer(label);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(label);
  }
  return out;
}

function shuffled<T>(items: T[], random: () => number): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr;
}
