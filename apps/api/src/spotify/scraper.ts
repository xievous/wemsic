import type { NormalizedTrack } from '@wemsic/shared';
import { parseSpotifyLink } from './client.js';

interface EmbedTrack {
  uri: string;
  title: string;
  subtitle?: string;
  duration: number;
  audioPreview?: { url: string } | null;
  artists?: Array<{ name: string }>;
}

interface EmbedEntity {
  type: string;
  id: string;
  uri?: string;
  name?: string;
  title?: string;
  subtitle?: string;
  duration?: number;
  audioPreview?: { url: string } | null;
  artists?: Array<{ name: string }>;
  coverArt?: { sources: Array<{ url: string }> };
  trackList?: EmbedTrack[];
}

interface EmbedPage {
  entity: EmbedEntity;
  accessToken: string | null;
}

interface PathfinderCoverSource {
  url: string;
  height?: number;
  width?: number;
}

interface PathfinderPlaylistItem {
  itemV2?: {
    __typename?: string;
    data?: {
      __typename?: string;
      uri?: string;
      name?: string;
      trackDuration?: { totalMilliseconds?: number };
      artists?: { items?: Array<{ profile?: { name?: string } }> };
      albumOfTrack?: { coverArt?: { sources?: PathfinderCoverSource[] } };
    };
  };
}

interface PathfinderAlbumItem {
  track?: {
    name?: string;
    uri?: string;
    duration?: { totalMilliseconds?: number };
    artists?: { items?: Array<{ profile?: { name?: string } }> };
  };
}

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const PATHFINDER_URL = 'https://api-partner.spotify.com/pathfinder/v2/query';
const GRAPHQL_PLAYLIST_HASH =
  '346811f856fb0b7e4f6c59f8ebea78dd081c6e2fb01b77c954b26259d5fc6763';
const GRAPHQL_ALBUM_HASH =
  'b9bfabef66ed756e5e13f68a942deb60bd4125ec1f1be8cc42769dc0259b4b10';

const PATHFINDER_PAGE_SIZE = 50;
const PATHFINDER_PAGE_DELAY_MS = 100;
const SPCLIENT_PAGE_SIZE = 120;
const TRACK_EMBED_BATCH_SIZE = 6;
const TRACK_EMBED_BATCH_DELAY_MS = 150;

const trackEmbedCache = new Map<string, EmbedTrack | null>();

export class ScrapeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ScrapeError';
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseEmbedNextData(html: string): {
  props?: {
    pageProps?: {
      status?: number;
      title?: string;
      state?: {
        data?: { entity?: EmbedEntity };
        settings?: { session?: { accessToken?: string } };
      };
    };
  };
} {
  const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!match) {
    throw new ScrapeError('Could not read track data from Spotify. Try again in a moment.');
  }

  try {
    return JSON.parse(match[1]);
  } catch {
    throw new ScrapeError('Could not parse Spotify playlist data.');
  }
}

async function fetchEmbedHtml(kind: 'playlist' | 'album' | 'track', id: string): Promise<string> {
  const res = await fetch(`https://open.spotify.com/embed/${kind}/${id}`, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'text/html' },
  });

  if (!res.ok) {
    throw new ScrapeError(
      'Could not load that Spotify link. Check the URL and make sure the playlist or album is public.',
    );
  }

  return res.text();
}

async function fetchEmbedPage(
  kind: 'playlist' | 'album',
  id: string,
): Promise<EmbedPage> {
  const html = await fetchEmbedHtml(kind, id);
  const pageProps = parseEmbedNextData(html).props?.pageProps;
  const entity = pageProps?.state?.data?.entity;
  const accessToken = pageProps?.state?.settings?.session?.accessToken ?? null;

  if (!entity?.trackList?.length) {
    const title = pageProps?.title ?? 'Unknown';
    if (pageProps?.status === 404 || title.toLowerCase().includes('not found')) {
      const hint =
        kind === 'album'
          ? ' That album may be unavailable in your region — try a playlist link instead.'
          : '';
      throw new ScrapeError(
        `Spotify could not find that playlist or album. Double-check the link.${hint}`,
      );
    }
    throw new ScrapeError(
      'No tracks found. The playlist or album must be public, or the link may be invalid.',
    );
  }

  if (kind === 'playlist' && !accessToken) {
    throw new ScrapeError('Could not read the full playlist from Spotify. Try again in a moment.');
  }

  return { entity, accessToken };
}

function trackIdFromUri(uri: string): string | null {
  const match = uri.match(/spotify:track:([a-zA-Z0-9]+)/);
  return match?.[1] ?? null;
}

function artistsFromEmbedTrack(raw: EmbedTrack): string[] {
  if (raw.artists?.length) {
    const names = raw.artists.map((a) => a.name.trim()).filter(Boolean);
    if (names.length > 0) return names;
  }
  if (raw.subtitle) {
    const names = raw.subtitle.split(',').map((name) => name.trim()).filter(Boolean);
    if (names.length > 0) return names;
  }
  return ['Unknown artist'];
}

function bestCoverUrl(sources: PathfinderCoverSource[] | undefined): string | null {
  if (!sources?.length) return null;
  return [...sources].sort((a, b) => (b.height ?? 0) - (a.height ?? 0))[0]?.url ?? null;
}

function toNormalizedTrack(
  raw: EmbedTrack,
  playerId: string,
  fallbackArt: string | null,
): NormalizedTrack | null {
  const spotifyTrackId = trackIdFromUri(raw.uri);
  if (!spotifyTrackId || !raw.title) return null;

  const artists = artistsFromEmbedTrack(raw);

  return {
    spotifyTrackId,
    title: raw.title,
    artists,
    albumArtUrl: fallbackArt,
    durationMs: raw.duration ?? 0,
    contributedBy: playerId,
    previewUrl: raw.audioPreview?.url ?? null,
  };
}

function previewMapFromEmbedTracks(trackList: EmbedTrack[] | undefined): Map<string, string> {
  const previews = new Map<string, string>();
  for (const raw of trackList ?? []) {
    const trackId = trackIdFromUri(raw.uri);
    if (trackId && raw.audioPreview?.url) {
      previews.set(trackId, raw.audioPreview.url);
    }
  }
  return previews;
}

async function pathfinderQuery<T>(accessToken: string, payload: object): Promise<T | null> {
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
    body: JSON.stringify(payload),
  });

  if (res.status === 429 || !res.ok) return null;
  return res.json() as Promise<T>;
}

function pathfinderTrackToNormalized(
  item: PathfinderPlaylistItem,
  playerId: string,
  fallbackArt: string | null,
  previewByTrackId: Map<string, string>,
): NormalizedTrack | null {
  const data = item.itemV2?.data;
  if (
    item.itemV2?.__typename !== 'TrackResponseWrapper' ||
    data?.__typename === 'NotFound' ||
    !data?.uri ||
    !data.name
  ) {
    return null;
  }

  const spotifyTrackId = trackIdFromUri(data.uri);
  if (!spotifyTrackId) return null;

  const artists =
    data.artists?.items
      ?.map((artist) => artist.profile?.name?.trim())
      .filter((name): name is string => !!name) ?? [];
  if (artists.length === 0) artists.push('Unknown artist');

  return {
    spotifyTrackId,
    title: data.name,
    artists,
    albumArtUrl: bestCoverUrl(data.albumOfTrack?.coverArt?.sources) ?? fallbackArt,
    durationMs: data.trackDuration?.totalMilliseconds ?? 0,
    contributedBy: playerId,
    previewUrl: previewByTrackId.get(spotifyTrackId) ?? null,
  };
}

async function fetchPlaylistTracksViaPathfinder(
  playlistId: string,
  accessToken: string,
  playerId: string,
  fallbackArt: string | null,
  previewByTrackId: Map<string, string>,
): Promise<{ tracks: NormalizedTrack[]; totalCount: number } | null> {
  const tracks: NormalizedTrack[] = [];
  const seen = new Set<string>();
  let offset = 0;
  let totalCount = 0;

  while (true) {
    const data = await pathfinderQuery<{
      data?: {
        playlistV2?: {
          content?: {
            totalCount?: number;
            items?: PathfinderPlaylistItem[];
          };
        };
      };
    }>(accessToken, {
      extensions: {
        persistedQuery: { sha256Hash: GRAPHQL_PLAYLIST_HASH, version: 1 },
      },
      operationName: 'fetchPlaylist',
      variables: {
        uri: `spotify:playlist:${playlistId}`,
        offset,
        limit: PATHFINDER_PAGE_SIZE,
        enableWatchFeedEntrypoint: true,
      },
    });

    const content = data?.data?.playlistV2?.content;
    const items = content?.items ?? [];
    if (!items.length) break;

    totalCount = content?.totalCount ?? totalCount;

    for (const item of items) {
      const track = pathfinderTrackToNormalized(item, playerId, fallbackArt, previewByTrackId);
      if (!track || seen.has(track.spotifyTrackId)) continue;
      seen.add(track.spotifyTrackId);
      tracks.push(track);
    }

    offset += PATHFINDER_PAGE_SIZE;
    if (items.length < PATHFINDER_PAGE_SIZE || (totalCount > 0 && offset >= totalCount)) {
      break;
    }

    await delay(PATHFINDER_PAGE_DELAY_MS);
  }

  if (tracks.length === 0) return null;
  return { tracks, totalCount: totalCount || tracks.length };
}

async function fetchAlbumTracksViaPathfinder(
  albumId: string,
  accessToken: string,
  playerId: string,
  fallbackArt: string | null,
  previewByTrackId: Map<string, string>,
): Promise<{ tracks: NormalizedTrack[]; totalCount: number } | null> {
  const tracks: NormalizedTrack[] = [];
  const seen = new Set<string>();
  let offset = 0;
  let totalCount = 0;
  let albumCover = fallbackArt;

  while (true) {
    const data = await pathfinderQuery<{
      data?: {
        albumUnion?: {
          coverArt?: { sources?: PathfinderCoverSource[] };
          tracksV2?: {
            totalCount?: number;
            items?: PathfinderAlbumItem[];
          };
        };
      };
    }>(accessToken, {
      extensions: {
        persistedQuery: { sha256Hash: GRAPHQL_ALBUM_HASH, version: 1 },
      },
      operationName: 'getAlbum',
      variables: {
        uri: `spotify:album:${albumId}`,
        locale: '',
        offset,
        limit: PATHFINDER_PAGE_SIZE,
      },
    });

    const album = data?.data?.albumUnion;
    const page = album?.tracksV2;
    const items = page?.items ?? [];
    if (!items.length) break;

    albumCover = bestCoverUrl(album?.coverArt?.sources) ?? albumCover;
    totalCount = page?.totalCount ?? totalCount;

    for (const item of items) {
      const raw = item.track;
      if (!raw?.uri || !raw.name) continue;

      const spotifyTrackId = trackIdFromUri(raw.uri);
      if (!spotifyTrackId || seen.has(spotifyTrackId)) continue;

      const artists =
        raw.artists?.items
          ?.map((artist) => artist.profile?.name?.trim())
          .filter((name): name is string => !!name) ?? [];
      if (artists.length === 0) artists.push('Unknown artist');

      seen.add(spotifyTrackId);
      tracks.push({
        spotifyTrackId,
        title: raw.name,
        artists,
        albumArtUrl: albumCover,
        durationMs: raw.duration?.totalMilliseconds ?? 0,
        contributedBy: playerId,
        previewUrl: previewByTrackId.get(spotifyTrackId) ?? null,
      });
    }

    offset += PATHFINDER_PAGE_SIZE;
    if (items.length < PATHFINDER_PAGE_SIZE || (totalCount > 0 && offset >= totalCount)) {
      break;
    }

    await delay(PATHFINDER_PAGE_DELAY_MS);
  }

  if (tracks.length === 0) return null;
  return { tracks, totalCount: totalCount || tracks.length };
}

async function fetchAllSpclientPlaylistUris(
  playlistId: string,
  accessToken: string,
): Promise<{ uris: string[]; total: number } | null> {
  const uris: string[] = [];
  let from = 0;
  let total = Infinity;

  while (from < total) {
    const res = await fetch(
      `https://spclient.wg.spotify.com/playlist/v2/playlist/${playlistId}?format=json&from=${from}&length=${SPCLIENT_PAGE_SIZE}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
          'User-Agent': USER_AGENT,
        },
      },
    );

    if (res.status === 429 || !res.ok) return uris.length > 0 ? { uris, total: uris.length } : null;

    const data = (await res.json()) as {
      length?: number;
      contents?: {
        truncated?: boolean;
        items?: Array<{ uri?: string }>;
      };
    };

    total = data.length ?? total;
    const pageUris =
      data.contents?.items
        ?.map((item) => item.uri)
        .filter((uri): uri is string => !!uri && uri.startsWith('spotify:track:')) ?? [];

    uris.push(...pageUris);

    if (pageUris.length === 0) break;
    from += pageUris.length;
    if (from >= total || data.contents?.truncated === false) break;
  }

  return { uris, total: Number.isFinite(total) ? total : uris.length };
}

async function fetchTrackEmbed(trackId: string): Promise<EmbedTrack | null> {
  if (trackEmbedCache.has(trackId)) {
    return trackEmbedCache.get(trackId) ?? null;
  }

  try {
    const html = await fetchEmbedHtml('track', trackId);
    const entity = parseEmbedNextData(html).props?.pageProps?.state?.data?.entity;
    if (!entity?.uri || !entity.title) {
      trackEmbedCache.set(trackId, null);
      return null;
    }

    const track: EmbedTrack = {
      uri: entity.uri,
      title: entity.title,
      subtitle: entity.subtitle,
      duration: entity.duration ?? 0,
      audioPreview: entity.audioPreview,
      artists: entity.artists,
    };
    trackEmbedCache.set(trackId, track);
    return track;
  } catch {
    trackEmbedCache.set(trackId, null);
    return null;
  }
}

async function hydrateMissingTracks(
  trackIds: string[],
  playerId: string,
  fallbackArt: string | null,
  seen: Set<string>,
): Promise<NormalizedTrack[]> {
  const hydrated: NormalizedTrack[] = [];

  for (let i = 0; i < trackIds.length; i += TRACK_EMBED_BATCH_SIZE) {
    const batch = trackIds.slice(i, i + TRACK_EMBED_BATCH_SIZE);
    const embeds = await Promise.all(batch.map((trackId) => fetchTrackEmbed(trackId)));

    for (const embed of embeds) {
      if (!embed) continue;
      const track = toNormalizedTrack(embed, playerId, fallbackArt);
      if (!track || seen.has(track.spotifyTrackId)) continue;
      seen.add(track.spotifyTrackId);
      hydrated.push(track);
    }

    if (i + TRACK_EMBED_BATCH_SIZE < trackIds.length) {
      await delay(TRACK_EMBED_BATCH_DELAY_MS);
    }
  }

  return hydrated;
}

function shuffleTracks<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
}

async function fetchTracksFromEmbedFallback(
  parsed: { kind: 'playlist' | 'album'; id: string },
  entity: EmbedEntity,
  accessToken: string | null,
  playerId: string,
  fallbackArt: string | null,
): Promise<{ tracks: NormalizedTrack[]; expectedTrackCount: number }> {
  const seen = new Set<string>();
  const tracks: NormalizedTrack[] = [];

  for (const raw of entity.trackList ?? []) {
    const track = toNormalizedTrack(raw, playerId, fallbackArt);
    if (!track || seen.has(track.spotifyTrackId)) continue;
    seen.add(track.spotifyTrackId);
    tracks.push(track);
  }

  let expectedTrackCount = tracks.length;

  if (parsed.kind === 'playlist' && accessToken) {
    const spclient = await fetchAllSpclientPlaylistUris(parsed.id, accessToken);
    if (spclient) {
      const uniqueUris = [...new Set(spclient.uris)];
      expectedTrackCount = uniqueUris.length;
      const missingIds = uniqueUris
        .map((uri) => trackIdFromUri(uri))
        .filter((trackId): trackId is string => !!trackId && !seen.has(trackId));

      if (missingIds.length > 0) {
        const extra = await hydrateMissingTracks(missingIds, playerId, fallbackArt, seen);
        tracks.push(...extra);
      }
    }
  }

  return { tracks, expectedTrackCount };
}

export async function scrapeMusicFromLink(
  input: string,
  playerId: string,
): Promise<{ tracks: NormalizedTrack[]; sourceName: string; truncated?: boolean }> {
  const parsed = parseSpotifyLink(input);
  if (!parsed) {
    throw new ScrapeError(
      'Invalid Spotify link. Paste a public playlist URL, album URL, or 22-character ID.',
    );
  }

  const embedKind = parsed.kind === 'album' ? 'album' : 'playlist';
  const { entity, accessToken } = await fetchEmbedPage(embedKind, parsed.id);

  const sourceName = entity.name ?? entity.title ?? 'Spotify import';
  const fallbackArt = entity.coverArt?.sources?.[0]?.url ?? null;
  const previewByTrackId = previewMapFromEmbedTracks(entity.trackList);

  let tracks: NormalizedTrack[] = [];
  let expectedTrackCount = entity.trackList?.length ?? 0;

  if (accessToken) {
    const pathfinderResult =
      parsed.kind === 'playlist'
        ? await fetchPlaylistTracksViaPathfinder(
            parsed.id,
            accessToken,
            playerId,
            fallbackArt,
            previewByTrackId,
          )
        : await fetchAlbumTracksViaPathfinder(
            parsed.id,
            accessToken,
            playerId,
            fallbackArt,
            previewByTrackId,
          );

    if (pathfinderResult) {
      tracks = pathfinderResult.tracks;
      expectedTrackCount = pathfinderResult.totalCount;
    }
  }

  if (tracks.length === 0) {
    const fallback = await fetchTracksFromEmbedFallback(
      parsed,
      entity,
      accessToken,
      playerId,
      fallbackArt,
    );
    tracks = fallback.tracks;
    expectedTrackCount = fallback.expectedTrackCount;
  }

  if (tracks.length === 0) {
    throw new ScrapeError('No importable tracks found in that playlist or album.');
  }

  shuffleTracks(tracks);

  const truncated = tracks.length < expectedTrackCount;

  return { tracks, sourceName, truncated: truncated || undefined };
}
