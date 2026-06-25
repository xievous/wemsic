import { config } from '../config.js';
import { getAnonymousSpotifyAccessToken } from './scraper.js';
import { USER_AGENT } from '../music/userAgent.js';

const PATHFINDER_URL = 'https://api-partner.spotify.com/pathfinder/v2/query';
const SEARCH_DESKTOP_HASH =
  '3c9d3f60dac5dea3876b6db3f534192b1c1d90032c4233c1bbaba526db41eb31';
const SEARCH_MAX_RESULTS = 8;

export interface SpotifyPlaylistSearchHit {
  id: string;
  name: string;
  owner?: string;
  trackCount?: number;
  thumbnailUrl?: string;
  url: string;
}

let cachedAppToken: { value: string; expiresAt: number } | null = null;

async function getClientCredentialsToken(): Promise<string | null> {
  if (!config.spotifyConfigured()) return null;
  if (cachedAppToken && cachedAppToken.expiresAt > Date.now()) {
    return cachedAppToken.value;
  }

  const body = new URLSearchParams({ grant_type: 'client_credentials' });
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(
        `${config.spotify.clientId}:${config.spotify.clientSecret}`,
      ).toString('base64')}`,
    },
    body,
  });
  if (!res.ok) return null;

  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedAppToken = {
    value: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000 - 60_000,
  };
  return cachedAppToken.value;
}

async function pathfinderSearch(
  accessToken: string,
  query: string,
): Promise<SpotifyPlaylistSearchHit[]> {
  const res = await fetch(PATHFINDER_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'User-Agent': USER_AGENT,
      Referer: 'https://open.spotify.com/',
      Origin: 'https://open.spotify.com',
    },
    body: JSON.stringify({
      operationName: 'searchDesktop',
      variables: {
        searchTerm: query,
        offset: 0,
        limit: SEARCH_MAX_RESULTS,
        numberOfTopResults: 5,
        includeAudiobooks: false,
        includePreReleases: false,
      },
      extensions: {
        persistedQuery: { version: 1, sha256Hash: SEARCH_DESKTOP_HASH },
      },
    }),
  });
  if (!res.ok) return [];

  const data = (await res.json()) as {
    data?: {
      searchV2?: {
        playlists?: {
          items?: Array<{
            __typename?: string;
            data?: {
              uri?: string;
              name?: string;
              description?: string;
              trackCount?: number;
              ownerV2?: { data?: { name?: string } };
              images?: { items?: Array<{ sources?: Array<{ url?: string }> }> };
            };
          }>;
        };
      };
    };
  };

  const hits: SpotifyPlaylistSearchHit[] = [];
  for (const item of data.data?.searchV2?.playlists?.items ?? []) {
    if (item.__typename !== 'PlaylistResponseWrapper') continue;
    const playlist = item.data;
    const id = playlist?.uri?.match(/spotify:playlist:([a-zA-Z0-9]+)/)?.[1];
    if (!id || !playlist?.name) continue;
    hits.push({
      id,
      name: playlist.name,
      owner: playlist.ownerV2?.data?.name,
      trackCount: playlist.trackCount,
      thumbnailUrl: playlist.images?.items?.[0]?.sources?.[0]?.url,
      url: `https://open.spotify.com/playlist/${id}`,
    });
  }
  return hits;
}

async function webApiSearch(
  accessToken: string,
  query: string,
): Promise<SpotifyPlaylistSearchHit[]> {
  const params = new URLSearchParams({
    q: query,
    type: 'playlist',
    limit: String(SEARCH_MAX_RESULTS),
  });
  const res = await fetch(`https://api.spotify.com/v1/search?${params}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });
  if (!res.ok) return [];

  const data = (await res.json()) as {
    playlists?: {
      items?: Array<{
        id?: string;
        name?: string;
        tracks?: { total?: number };
        external_urls?: { spotify?: string };
        images?: Array<{ url?: string }>;
        owner?: { display_name?: string };
      } | null>;
    };
  };

  const hits: SpotifyPlaylistSearchHit[] = [];
  for (const item of data.playlists?.items ?? []) {
    if (!item?.id || !item.name) continue;
    hits.push({
      id: item.id,
      name: item.name,
      owner: item.owner?.display_name,
      trackCount: item.tracks?.total,
      thumbnailUrl: item.images?.[0]?.url,
      url: item.external_urls?.spotify ?? `https://open.spotify.com/playlist/${item.id}`,
    });
  }
  return hits;
}

function dedupeHits(hits: SpotifyPlaylistSearchHit[]): SpotifyPlaylistSearchHit[] {
  const seen = new Set<string>();
  const result: SpotifyPlaylistSearchHit[] = [];
  for (const hit of hits) {
    if (seen.has(hit.id)) continue;
    seen.add(hit.id);
    result.push(hit);
  }
  return result.slice(0, SEARCH_MAX_RESULTS);
}

export async function searchSpotifyPlaylists(theme: string): Promise<SpotifyPlaylistSearchHit[]> {
  const trimmed = theme.trim();
  if (!trimmed) return [];

  const queries = [`${trimmed} playlist`, trimmed];
  const all: SpotifyPlaylistSearchHit[] = [];

  const appToken = await getClientCredentialsToken();
  if (appToken) {
    for (const query of queries) {
      all.push(...(await webApiSearch(appToken, query)));
      if (dedupeHits(all).length >= SEARCH_MAX_RESULTS) break;
    }
    const deduped = dedupeHits(all);
    if (deduped.length > 0) return deduped;
  }

  const embedToken = await getAnonymousSpotifyAccessToken();
  if (!embedToken) return [];

  for (const query of queries) {
    all.push(...(await pathfinderSearch(embedToken, query)));
    if (dedupeHits(all).length >= SEARCH_MAX_RESULTS) break;
  }

  return dedupeHits(all);
}
