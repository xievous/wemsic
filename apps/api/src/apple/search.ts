import { getAppleToken } from './scraper.js';
import { USER_AGENT } from '../music/userAgent.js';

const AMP_API = 'https://amp-api.music.apple.com';
const DEFAULT_STOREFRONT = 'us';
const SEARCH_MAX_RESULTS = 8;

export interface ApplePlaylistSearchHit {
  id: string;
  name: string;
  curator?: string;
  url: string;
  storefront: string;
  thumbnailUrl?: string;
  trackCount?: number;
}

interface AppleSearchResponse {
  results?: {
    playlists?: {
      data?: Array<{
        id?: string;
        attributes?: {
          name?: string;
          curatorName?: string;
          url?: string;
          artwork?: { url?: string };
        };
      }>;
    };
  };
}

function appleArtworkUrl(template: string | undefined, size = 300): string | undefined {
  if (!template) return undefined;
  return template.replace('{w}', String(size)).replace('{h}', String(size));
}

async function ampFetch<T>(path: string, token: string): Promise<T | null> {
  const res = await fetch(`${AMP_API}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Origin: 'https://music.apple.com',
      Referer: 'https://music.apple.com/',
      'User-Agent': USER_AGENT,
      Accept: 'application/json',
    },
  });
  if (!res.ok) return null;
  return res.json() as Promise<T>;
}

async function searchForQuery(
  token: string,
  query: string,
  storefront: string,
): Promise<ApplePlaylistSearchHit[]> {
  const term = encodeURIComponent(query);
  const data = await ampFetch<AppleSearchResponse>(
    `/v1/catalog/${storefront}/search?term=${term}&types=playlists&limit=${SEARCH_MAX_RESULTS}`,
    token,
  );
  if (!data) return [];

  const hits: ApplePlaylistSearchHit[] = [];
  for (const playlist of data.results?.playlists?.data ?? []) {
    const id = playlist.id;
    const attrs = playlist.attributes;
    if (!id || !attrs?.name) continue;
    hits.push({
      id,
      name: attrs.name,
      curator: attrs.curatorName,
      url:
        attrs.url ??
        `https://music.apple.com/${storefront}/playlist/${encodeURIComponent(attrs.name.toLowerCase().replace(/\s+/g, '-'))}/${id}`,
      storefront,
      thumbnailUrl: appleArtworkUrl(attrs.artwork?.url),
    });
  }
  return hits;
}

interface AppleTracksPageResponse {
  data?: unknown[];
  next?: string;
}

function nextAmpPath(nextUrl: string): string {
  return nextUrl.startsWith(AMP_API) ? nextUrl.slice(AMP_API.length) : nextUrl;
}

async function fetchPlaylistTrackCount(
  token: string,
  storefront: string,
  playlistId: string,
): Promise<number | undefined> {
  let total = 0;
  let nextPath: string | null =
    `/v1/catalog/${storefront}/playlists/${playlistId}/tracks?limit=100`;
  let pages = 0;

  while (nextPath && pages < 6) {
    const data = await ampFetch<AppleTracksPageResponse>(nextPath, token);
    if (!data) return total > 0 ? total : undefined;
    total += data.data?.length ?? 0;
    if (!data.next) return total > 0 ? total : undefined;
    nextPath = nextAmpPath(data.next);
    pages++;
  }

  return total > 0 ? total : undefined;
}

async function enrichHitTrackCount(
  hit: ApplePlaylistSearchHit,
  token: string,
): Promise<ApplePlaylistSearchHit> {
  if (hit.trackCount != null) return hit;
  const total = await fetchPlaylistTrackCount(token, hit.storefront, hit.id);
  return total != null ? { ...hit, trackCount: total } : hit;
}

export async function enrichApplePlaylistTrackCounts(
  hits: ApplePlaylistSearchHit[],
  token: string,
): Promise<ApplePlaylistSearchHit[]> {
  if (hits.length === 0) return hits;
  return Promise.all(hits.map((hit) => enrichHitTrackCount(hit, token)));
}

function dedupeHits(hits: ApplePlaylistSearchHit[]): ApplePlaylistSearchHit[] {
  const seen = new Set<string>();
  const result: ApplePlaylistSearchHit[] = [];
  for (const hit of hits) {
    if (seen.has(hit.id)) continue;
    seen.add(hit.id);
    result.push(hit);
  }
  return result.slice(0, SEARCH_MAX_RESULTS);
}

export async function searchAppleMusicPlaylists(
  theme: string,
  storefront = DEFAULT_STOREFRONT,
): Promise<ApplePlaylistSearchHit[]> {
  const trimmed = theme.trim();
  if (!trimmed) return [];

  const token = await getAppleToken();
  const queries = [`${trimmed} playlist`, trimmed];
  const all: ApplePlaylistSearchHit[] = [];

  for (const query of queries) {
    all.push(...(await searchForQuery(token, query, storefront)));
    if (dedupeHits(all).length >= SEARCH_MAX_RESULTS) break;
  }

  return enrichApplePlaylistTrackCounts(dedupeHits(all), token);
}
