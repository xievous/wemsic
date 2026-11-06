import { cleanAlbumTitle, normalizeAnswer, stripTitleQualifiers } from '@wemsic/shared';
import { findSong } from '../deezer/preview.js';

/** What trivia rounds need to know about a song beyond its title and artist. */
export interface TrackFacts {
  /** The studio album it's from; null when only singles and compilations have it. */
  album: string | null;
  /** The year it first came out. */
  year: number | null;
  /** The artist's best-known other albums, for wrong answers. */
  otherAlbums: string[];
}

/**
 * The iTunes Search API (free, no key) keeps original release dates on
 * remasters, which Deezer doesn't: Deezer only has Nevermind's 2011 reissue.
 */
interface ItunesSong {
  artistId?: number;
  artistName?: string;
  trackName?: string;
  collectionName?: string;
  trackCount?: number;
  releaseDate?: string;
}

interface ItunesAlbum {
  wrapperType?: string;
  collectionName?: string;
  trackCount?: number;
}

const NO_FACTS: TrackFacts = { album: null, year: null, otherAlbums: [] };

/** Albums that collect songs from elsewhere, so they make a poor answer. */
const COMPILATION =
  /\b(greatest|hits|best of|collection|essential|essentials|anthology|playlist|now that|singles|b-sides|ballads|karaoke|tribute|live|ep|soundtrack)\b/i;

/** Fewer tracks than this and it's a single or an EP, not an album. */
const MIN_ALBUM_TRACKS = 6;

/** How many of the artist's albums to draw wrong answers from. */
const OTHER_ALBUM_POOL = 8;

const factsCache = new Map<string, TrackFacts>();
const albumsCache = new Map<number, ItunesAlbum[]>();

async function getJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url);
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}

/**
 * Album and release year of a song. Network errors give empty facts without
 * caching, so a later round can try again; the round then asks something else.
 */
export async function resolveTrackFacts(artist: string, title: string): Promise<TrackFacts> {
  const key = `${artist}::${title}`.toLowerCase();
  const cached = factsCache.get(key);
  if (cached) return cached;

  const coreTitle = stripTitleQualifiers(title);
  const term = encodeURIComponent(`${artist} ${coreTitle}`);
  const search = await getJson<{ results?: ItunesSong[] }>(
    `https://itunes.apple.com/search?term=${term}&entity=song&limit=25`,
  );
  if (!search) return NO_FACTS;

  // Every release of this song by this artist: the album, the single, reissues.
  const versions = (search.results ?? []).map((r) => ({
    ...r,
    title: r.trackName,
    artist: { name: r.artistName },
  }));
  const matches: ItunesSong[] = [];
  let rest = versions;
  for (let song = findSong(rest, artist, coreTitle); song; song = findSong(rest, artist, coreTitle)) {
    matches.push(song);
    rest = rest.filter((r) => r !== song);
  }
  if (matches.length === 0) {
    factsCache.set(key, NO_FACTS);
    return NO_FACTS;
  }

  const albumSong = matches.find((m) => albumAnswer(m, coreTitle));
  const album = albumSong ? albumAnswer(albumSong, coreTitle) : null;
  const facts: TrackFacts = {
    album,
    year: earliestYear(matches),
    otherAlbums: album && albumSong?.artistId ? await otherAlbums(albumSong.artistId, album, coreTitle) : [],
  };
  factsCache.set(key, facts);
  return facts;
}

/** The album as an answer, or null for singles, EPs, compilations and albums named after the song. */
function albumAnswer(song: ItunesSong, coreTitle: string): string | null {
  return albumTitle(song.collectionName, song.trackCount, coreTitle);
}

function albumTitle(raw: string | undefined, trackCount: number | undefined, coreTitle: string): string | null {
  if (!raw || (trackCount ?? 0) < MIN_ALBUM_TRACKS || /\s-\s(single|ep)$/i.test(raw)) return null;
  const album = cleanAlbumTitle(raw);
  const key = normalizeAnswer(album);
  if (!key || key === normalizeAnswer(coreTitle) || COMPILATION.test(album)) return null;
  return album;
}

/** Reissues keep the original date, so the earliest one is when the song came out. */
function earliestYear(songs: ItunesSong[]): number | null {
  const latest = new Date().getFullYear() + 1;
  const years = songs
    .map((s) => Number(s.releaseDate?.slice(0, 4)))
    .filter((y) => y >= 1900 && y <= latest);
  return years.length ? Math.min(...years) : null;
}

/** The artist's other albums, best known first, without editions of the same one. */
async function otherAlbums(artistId: number, answer: string, coreTitle: string): Promise<string[]> {
  let albums = albumsCache.get(artistId);
  if (!albums) {
    const res = await getJson<{ results?: ItunesAlbum[] }>(
      `https://itunes.apple.com/lookup?id=${artistId}&entity=album&limit=50`,
    );
    if (!res) return [];
    albums = (res.results ?? []).filter((r) => r.wrapperType === 'collection');
    albumsCache.set(artistId, albums);
  }

  const seen = new Set([normalizeAnswer(answer)]);
  const titles: string[] = [];
  for (const a of albums) {
    const title = albumTitle(a.collectionName, a.trackCount, coreTitle);
    const key = title && normalizeAnswer(title);
    if (!title || !key || seen.has(key)) continue;
    seen.add(key);
    titles.push(title);
    if (titles.length === OTHER_ALBUM_POOL) break;
  }
  return titles;
}
