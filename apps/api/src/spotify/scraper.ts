import type { NormalizedTrack } from '@wemsic/shared';
import { parseSpotifyLink } from './client.js';

interface EmbedTrack {
  uri: string;
  title: string;
  subtitle: string;
  duration: number;
  audioPreview?: { url: string } | null;
}

interface EmbedEntity {
  type: string;
  id: string;
  name?: string;
  title?: string;
  coverArt?: { sources: Array<{ url: string }> };
  trackList?: EmbedTrack[];
}

interface EmbedPage {
  entity: EmbedEntity;
  accessToken: string;
}

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const EMBED_TRACK_LIMIT = 50;

export class ScrapeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ScrapeError';
  }
}

async function fetchEmbedPage(
  kind: 'playlist' | 'album',
  id: string,
): Promise<EmbedPage> {
  const res = await fetch(`https://open.spotify.com/embed/${kind}/${id}`, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'text/html' },
  });

  if (!res.ok) {
    throw new ScrapeError(
      'Could not load that Spotify link. Check the URL and make sure the playlist or album is public.',
    );
  }

  const html = await res.text();
  const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!match) {
    throw new ScrapeError('Could not read track data from Spotify. Try again in a moment.');
  }

  let data: {
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
  };

  try {
    data = JSON.parse(match[1]);
  } catch {
    throw new ScrapeError('Could not parse Spotify playlist data.');
  }

  const pageProps = data.props?.pageProps;
  const entity = pageProps?.state?.data?.entity;
  const accessToken = pageProps?.state?.settings?.session?.accessToken;

  if (!entity?.trackList?.length) {
    const title = pageProps?.title ?? 'Unknown';
    if (pageProps?.status === 404 || title.toLowerCase().includes('not found')) {
      throw new ScrapeError(
        'Spotify could not find that playlist or album. Double-check the link.',
      );
    }
    throw new ScrapeError(
      'No tracks found. The playlist or album must be public, or the link may be invalid.',
    );
  }

  if (!accessToken) {
    throw new ScrapeError('Could not authenticate with Spotify embed. Try again.');
  }

  return { entity, accessToken };
}

function trackIdFromUri(uri: string): string | null {
  const match = uri.match(/spotify:track:([a-zA-Z0-9]+)/);
  return match?.[1] ?? null;
}

function toNormalizedTrack(
  raw: EmbedTrack,
  playerId: string,
  fallbackArt: string | null,
): NormalizedTrack | null {
  const spotifyTrackId = trackIdFromUri(raw.uri);
  if (!spotifyTrackId || !raw.title) return null;

  const artists = raw.subtitle
    ? raw.subtitle.split(',').map((name) => name.trim()).filter(Boolean)
    : ['Unknown artist'];

  return {
    spotifyTrackId,
    title: raw.title,
    artists: artists.length > 0 ? artists : ['Unknown artist'],
    albumArtUrl: fallbackArt,
    durationMs: raw.duration ?? 0,
    contributedBy: playerId,
    previewUrl: raw.audioPreview?.url ?? null,
  };
}

async function fetchPaginatedPlaylistTracks(
  playlistId: string,
  accessToken: string,
  playerId: string,
  fallbackArt: string | null,
  existingIds: Set<string>,
): Promise<NormalizedTrack[]> {
  const extra: NormalizedTrack[] = [];
  let offset = EMBED_TRACK_LIMIT;

  while (offset < 500) {
    const res = await fetch(
      `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=50&offset=${offset}&fields=items(track(id,name,artists(name),duration_ms,album(images))),next`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );

    if (res.status === 429 || !res.ok) break;

    const page = (await res.json()) as {
      items?: Array<{
        track?: {
          id?: string;
          name?: string;
          artists?: Array<{ name: string }>;
          duration_ms?: number;
          album?: { images?: Array<{ url: string }> };
        } | null;
      }>;
      next?: string | null;
    };

    if (!page.items?.length) break;

    for (const entry of page.items) {
      const track = entry.track;
      if (!track?.id || !track.name || existingIds.has(track.id)) continue;
      existingIds.add(track.id);
      extra.push({
        spotifyTrackId: track.id,
        title: track.name,
        artists: track.artists?.map((a) => a.name).filter(Boolean) ?? ['Unknown artist'],
        albumArtUrl: track.album?.images?.[0]?.url ?? fallbackArt,
        durationMs: track.duration_ms ?? 0,
        contributedBy: playerId,
      });
    }

    if (!page.next || page.items.length < 50) break;
    offset += 50;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  return extra;
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

  let truncated = false;

  if (parsed.kind === 'playlist' && tracks.length >= EMBED_TRACK_LIMIT) {
    const extra = await fetchPaginatedPlaylistTracks(
      parsed.id,
      accessToken,
      playerId,
      fallbackArt,
      seen,
    );
    if (extra.length === 0) {
      truncated = true;
    } else {
      tracks.push(...extra);
    }
  }

  if (tracks.length === 0) {
    throw new ScrapeError('No importable tracks found in that playlist or album.');
  }

  shuffleTracks(tracks);
  return { tracks, sourceName, truncated: truncated || undefined };
}
