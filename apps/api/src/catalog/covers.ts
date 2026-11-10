/**
 * Playlist cover art from the source, for the places that don't get one for free.
 *
 * Spotify's own editorial playlists (ids starting `37i9dQZF`) come back from
 * search without an image, and oEmbed has no thumbnail for them either. Their
 * embed page does carry the cover, so we read it from there and cache it.
 */

import { USER_AGENT } from '../music/userAgent.js';

const SPOTIFY_EMBED ='https://open.spotify.com/embed/playlist/';
const COVER_CDN = 'https://i.scdn.co/image/';
/** Size code for the 300px variant of a Spotify playlist image. */
const COVER_300 = 'ab67706f00000002';

const COVER_TTL_MS = 24 * 60 * 60 * 1000;
/** A failed lookup is retried sooner than a found cover is refreshed. */
const MISS_TTL_MS = 10 * 60 * 1000;
const FETCH_TIMEOUT_MS = 8000;
const RETRY_DELAY_MS = 600;

type Entry = { url: string | null; at: number };
const cache = new Map<string, Entry>();
const inflight = new Map<string, Promise<string | null>>();

export function spotifyPlaylistIdFromUrl(url: string | undefined): string | null {
  return url?.match(/open\.spotify\.com\/(?:embed\/)?playlist\/([A-Za-z0-9]+)/)?.[1] ?? null;
}

/**
 * The playlist cover in a Spotify embed page, as its 300px variant. Playlist
 * images use the `ab67706f` prefix, an 8-character size code, then a 24-character hash.
 */
export function coverFromEmbedHtml(html: string): string | null {
  const match = html.match(/\/image\/ab67706f[0-9a-f]{8}([0-9a-f]{24})(?![0-9a-f])/);
  return match ? `${COVER_CDN}${COVER_300}${match[1]}` : null;
}

function isFresh(entry: Entry, now: number): boolean {
  return now - entry.at < (entry.url ? COVER_TTL_MS : MISS_TTL_MS);
}

async function fetchSpotifyCoverOnce(playlistId: string): Promise<string | null> {
  try {
    const res = await fetch(`${SPOTIFY_EMBED}${playlistId}`, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'text/html' },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    return coverFromEmbedHtml(await res.text());
  } catch {
    return null;
  }
}

/** Spotify now and then turns away one of a burst of requests; one retry covers it. */
async function fetchSpotifyCover(playlistId: string): Promise<string | null> {
  const first = await fetchSpotifyCoverOnce(playlistId);
  if (first) return first;
  await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
  return fetchSpotifyCoverOnce(playlistId);
}

/** The cover for a Spotify playlist, cached for a day; null when it can't be found. */
export async function spotifyPlaylistCover(
  playlistId: string,
  now = Date.now(),
): Promise<string | null> {
  const cached = cache.get(playlistId);
  if (cached && isFresh(cached, now)) return cached.url;

  let pending = inflight.get(playlistId);
  if (!pending) {
    pending = fetchSpotifyCover(playlistId).then((url) => {
      // Keep a stale cover rather than replacing it with a miss.
      cache.set(playlistId, { url: url ?? cached?.url ?? null, at: now });
      inflight.delete(playlistId);
      return url ?? cached?.url ?? null;
    });
    inflight.set(playlistId, pending);
  }
  return pending;
}

/**
 * A smaller YouTube Music thumbnail. Their playlist art often comes at
 * 544–1200px (up to ~220 KB); 300px is plenty for a cover tile.
 */
export function smallYouTubeThumbnail(url: string | undefined | null): string | undefined {
  if (!url) return undefined;
  if (!/(googleusercontent\.com|ggpht\.com)\//.test(url)) return url;
  return url.replace(/=w\d+-h\d+/, '=w300-h300').replace(/=s\d+$/, '=s300');
}

/** Test hook: forget every cached cover. */
export function clearCoverCache(): void {
  cache.clear();
  inflight.clear();
}
