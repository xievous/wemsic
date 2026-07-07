import type { NormalizedTrack } from '@wemsic/shared';
import {
  ScrapeError,
  type ScrapeProgressCallback,
} from '../spotify/scraper.js';
import { USER_AGENT } from '../music/userAgent.js';

const AMP_API = 'https://amp-api.music.apple.com';
const PAGE_SIZE = 100;

interface AppleSongAttributes {
  name?: string;
  artistName?: string;
  durationInMillis?: number;
  artwork?: { url?: string };
}

interface AppleSongResource {
  id?: string;
  attributes?: AppleSongAttributes;
}

interface AppleTracksResponse {
  data?: AppleSongResource[];
  next?: string;
}

interface ApplePlaylistResponse {
  data?: Array<{
    attributes?: {
      name?: string;
      artwork?: { url?: string };
    };
  }>;
}

let cachedToken: { value: string; expiresAt: number } | null = null;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function decodeJwtExpMs(token: string): number {
  try {
    const payload = JSON.parse(
      Buffer.from(token.split('.')[1] ?? '', 'base64url').toString('utf8'),
    ) as { exp?: number };
    return (payload.exp ?? 0) * 1000;
  } catch {
    return Date.now() + 30 * 60 * 1000;
  }
}

async function fetchAppleWebToken(): Promise<string> {
  const pageRes = await fetch('https://music.apple.com/us/browse', {
    headers: { 'User-Agent': USER_AGENT, Accept: 'text/html' },
  });
  if (!pageRes.ok) {
    throw new ScrapeError('Could not reach Apple Music. Try again in a moment.');
  }

  const html = await pageRes.text();
  const scriptMatch = html.match(/src="(\/assets\/index~[^"]+\.js)"/);
  if (!scriptMatch) {
    throw new ScrapeError('Could not read Apple Music credentials. Try again in a moment.');
  }

  const jsRes = await fetch(`https://music.apple.com${scriptMatch[1]}`, {
    headers: { 'User-Agent': USER_AGENT },
  });
  if (!jsRes.ok) {
    throw new ScrapeError('Could not read Apple Music credentials. Try again in a moment.');
  }

  const js = await jsRes.text();
  const tokens = [
    ...new Set(
      [...js.matchAll(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g)].map(
        (match) => match[0],
      ),
    ),
  ];
  if (tokens.length === 0) {
    throw new ScrapeError('Could not read Apple Music credentials. Try again in a moment.');
  }

  const token = tokens[0]!;
  cachedToken = { value: token, expiresAt: decodeJwtExpMs(token) - 60_000 };
  return token;
}

async function getAppleToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.value;
  }
  return fetchAppleWebToken();
}

export { getAppleToken };

function appleArtworkUrl(template: string | undefined, size = 300): string | null {
  if (!template) return null;
  return template.replace('{w}', String(size)).replace('{h}', String(size));
}

function artistsFromAppleName(artistName: string | undefined): string[] {
  if (!artistName?.trim()) return ['Unknown artist'];
  return artistName
    .split(/\s*(?:,|&|\band\b)\s*/i)
    .map((name) => name.trim())
    .filter(Boolean);
}

async function ampFetch<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`${AMP_API}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Origin: 'https://music.apple.com',
      Referer: 'https://music.apple.com/',
      'User-Agent': USER_AGENT,
      Accept: 'application/json',
    },
  });

  if (res.status === 404) {
    throw new ScrapeError(
      'Apple Music playlist or album not found. Check that the link is public and copied correctly.',
    );
  }
  if (!res.ok) {
    throw new ScrapeError(`Apple Music request failed (${res.status}). Try again in a moment.`);
  }

  return res.json() as Promise<T>;
}

async function fetchSourceName(
  storefront: string,
  kind: 'playlists' | 'albums',
  id: string,
  token: string,
): Promise<{ name: string; fallbackArt: string | null }> {
  const data = await ampFetch<ApplePlaylistResponse>(
    `/v1/catalog/${storefront}/${kind}/${id}`,
    token,
  );
  const attrs = data.data?.[0]?.attributes;
  return {
    name: attrs?.name ?? 'Apple Music import',
    fallbackArt: appleArtworkUrl(attrs?.artwork?.url),
  };
}

function toNormalizedTrack(
  song: AppleSongResource,
  playerId: string,
  fallbackArt: string | null,
): NormalizedTrack | null {
  const id = song.id;
  const attrs = song.attributes;
  if (!id || !attrs?.name) return null;

  return {
    spotifyTrackId: `apple:${id}`,
    title: attrs.name,
    artists: artistsFromAppleName(attrs.artistName),
    albumArtUrl: appleArtworkUrl(attrs.artwork?.url) ?? fallbackArt,
    durationMs: attrs.durationInMillis ?? 0,
    contributedBy: playerId,
    previewUrl: null,
  };
}

async function fetchAllTracks(
  storefront: string,
  kind: 'playlists' | 'albums',
  id: string,
  token: string,
  playerId: string,
  fallbackArt: string | null,
  onProgress?: ScrapeProgressCallback,
): Promise<{ tracks: NormalizedTrack[]; totalCount: number }> {
  const tracks: NormalizedTrack[] = [];
  const seen = new Set<string>();
  let nextPath: string | null =
    `/v1/catalog/${storefront}/${kind}/${id}/tracks?limit=${PAGE_SIZE}`;
  let totalCount = 0;

  while (nextPath) {
    const page: AppleTracksResponse = await ampFetch<AppleTracksResponse>(nextPath, token);
    const items = page.data ?? [];

    for (const song of items) {
      const track = toNormalizedTrack(song, playerId, fallbackArt);
      if (!track || seen.has(track.spotifyTrackId)) continue;
      seen.add(track.spotifyTrackId);
      tracks.push(track);
    }

    totalCount = Math.max(totalCount, tracks.length);
    onProgress?.({
      phase: 'loading',
      loaded: tracks.length,
      total: page.next ? null : tracks.length,
      label: 'Loading tracks…',
    });

    nextPath = page.next ?? null;
    if (nextPath) await delay(80);
  }

  return { tracks, totalCount: totalCount || tracks.length };
}

function shuffleTracks<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
}

export async function scrapeAppleMusicFromLink(
  storefront: string,
  kind: 'playlist' | 'album',
  id: string,
  playerId: string,
  onProgress?: ScrapeProgressCallback,
): Promise<{
  tracks: NormalizedTrack[];
  sourceName: string;
  thumbnailUrl?: string | null;
  truncated?: boolean;
}> {
  onProgress?.({
    phase: 'opening',
    loaded: 0,
    total: null,
    label: 'Opening Apple Music…',
  });

  const token = await getAppleToken();
  const apiKind = kind === 'album' ? 'albums' : 'playlists';
  const { name: sourceName, fallbackArt } = await fetchSourceName(
    storefront,
    apiKind,
    id,
    token,
  );

  onProgress?.({
    phase: 'loading',
    loaded: 0,
    total: null,
    label: kind === 'album' ? 'Loading album tracks…' : 'Loading tracks…',
  });

  const { tracks, totalCount } = await fetchAllTracks(
    storefront,
    apiKind,
    id,
    token,
    playerId,
    fallbackArt,
    onProgress,
  );

  if (tracks.length === 0) {
    throw new ScrapeError('No importable tracks found in that Apple Music playlist or album.');
  }

  onProgress?.({
    phase: 'finishing',
    loaded: tracks.length,
    total: totalCount,
    label: 'Finishing up…',
  });

  shuffleTracks(tracks);

  const truncated = tracks.length < totalCount;
  return { tracks, sourceName, thumbnailUrl: fallbackArt, truncated: truncated || undefined };
}
