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

interface SpclientPlaylist {
  uris: string[];
  total: number;
}

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

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

async function fetchSpclientPlaylist(
  playlistId: string,
  accessToken: string,
): Promise<SpclientPlaylist | null> {
  const res = await fetch(
    `https://spclient.wg.spotify.com/playlist/v2/playlist/${playlistId}?format=json`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
        'User-Agent': USER_AGENT,
      },
    },
  );

  if (res.status === 429 || !res.ok) return null;

  const data = (await res.json()) as {
    length?: number;
    contents?: { items?: Array<{ uri?: string }> };
  };

  const uris =
    data.contents?.items
      ?.map((item) => item.uri)
      .filter((uri): uri is string => !!uri && uri.startsWith('spotify:track:')) ?? [];

  return {
    uris,
    total: data.length ?? uris.length,
  };
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
    const spclient = await fetchSpclientPlaylist(parsed.id, accessToken);
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

  if (tracks.length === 0) {
    throw new ScrapeError('No importable tracks found in that playlist or album.');
  }

  shuffleTracks(tracks);

  const truncated = tracks.length < expectedTrackCount;

  return { tracks, sourceName, truncated: truncated || undefined };
}
