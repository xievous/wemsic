import { MAX_TRACKS_PER_PLAYER } from '@wemsic/shared';
import type { NormalizedTrack } from '@wemsic/shared';
import { config } from '../config.js';
import type { SpotifyPlaylistSummary, SpotifyTokens, SpotifyTrackRaw } from './types.js';

const tokenStore = new Map<
  string,
  { accessToken: string; refreshToken: string; expiresAt: number }
>();
const pkceStore = new Map<
  string,
  { verifier: string; playerId: string; roomCode: string; expiresAt: number }
>();

export function storePkceSession(
  state: string,
  verifier: string,
  playerId: string,
  roomCode: string,
): void {
  pkceStore.set(state, {
    verifier,
    playerId,
    roomCode,
    expiresAt: Date.now() + 10 * 60 * 1000,
  });
}

export function consumePkceSession(state: string) {
  const session = pkceStore.get(state);
  pkceStore.delete(state);
  if (!session || session.expiresAt < Date.now()) return null;
  return session;
}

export function getSpotifyTokens(playerId: string): SpotifyTokens | null {
  return tokenStore.get(playerId) ?? null;
}

export function setSpotifyTokens(playerId: string, tokens: SpotifyTokens): void {
  tokenStore.set(playerId, tokens);
}

export function clearSpotifyTokens(playerId: string): void {
  tokenStore.delete(playerId);
}

export function getLoginUrl(state: string, codeChallenge: string): string {
  const params = new URLSearchParams({
    client_id: config.spotify.clientId,
    response_type: 'code',
    redirect_uri: config.spotify.redirectUri,
    scope: 'playlist-read-private playlist-read-collaborative',
    state,
    code_challenge_method: 'S256',
    code_challenge: codeChallenge,
  });
  return `https://accounts.spotify.com/authorize?${params}`;
}

export async function exchangeCode(
  code: string,
  codeVerifier: string,
): Promise<SpotifyTokens> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: config.spotify.redirectUri,
    client_id: config.spotify.clientId,
    client_secret: config.spotify.clientSecret,
    code_verifier: codeVerifier,
  });

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Spotify token exchange failed: ${err}`);
  }

  const data = (await res.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + data.expires_in * 1000 - 60_000,
  };
}

async function refreshAccessToken(tokens: SpotifyTokens): Promise<SpotifyTokens> {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: tokens.refreshToken,
    client_id: config.spotify.clientId,
    client_secret: config.spotify.clientSecret,
  });

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!res.ok) throw new Error('Spotify token refresh failed');

  const data = (await res.json()) as {
    access_token: string;
    expires_in: number;
    refresh_token?: string;
  };

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? tokens.refreshToken,
    expiresAt: Date.now() + data.expires_in * 1000 - 60_000,
  };
}

async function getValidToken(playerId: string): Promise<string> {
  let tokens = tokenStore.get(playerId);
  if (!tokens) throw new Error('Spotify not connected');
  if (tokens.expiresAt < Date.now()) {
    tokens = await refreshAccessToken(tokens);
    tokenStore.set(playerId, tokens);
  }
  return tokens.accessToken;
}

async function spotifyFetch<T>(playerId: string, path: string): Promise<T> {
  const token = await getValidToken(playerId);
  const res = await fetch(`https://api.spotify.com/v1${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Spotify API error: ${res.status} ${text}`);
  }
  return res.json() as Promise<T>;
}

export async function fetchUserPlaylists(
  playerId: string,
): Promise<SpotifyPlaylistSummary[]> {
  const data = await spotifyFetch<{
    items: Array<{
      id: string;
      name: string;
      tracks: { total: number };
      images: Array<{ url: string }>;
    }>;
  }>(playerId, '/me/playlists?limit=50');

  return data.items.map((p) => ({
    id: p.id,
    name: p.name,
    trackCount: p.tracks.total,
    imageUrl: p.images[0]?.url ?? null,
  }));
}

export type SpotifyLinkKind = 'playlist' | 'album';

export interface ParsedSpotifyLink {
  kind: SpotifyLinkKind;
  id: string;
}

const SPOTIFY_ID = '[a-zA-Z0-9]{22}';

export function parseSpotifyLink(input: string): ParsedSpotifyLink | null {
  const trimmed = input.trim();
  if (new RegExp(`^${SPOTIFY_ID}$`).test(trimmed)) {
    return { kind: 'playlist', id: trimmed };
  }

  const album = trimmed.match(new RegExp(`album\\/(${SPOTIFY_ID})`, 'i'))?.[1];
  if (album) return { kind: 'album', id: album };

  const playlist = trimmed.match(new RegExp(`playlist\\/(${SPOTIFY_ID})`, 'i'))?.[1];
  if (playlist) return { kind: 'playlist', id: playlist };

  return null;
}

/** @deprecated use parseSpotifyLink */
export function parsePlaylistId(input: string): string | null {
  const parsed = parseSpotifyLink(input);
  return parsed?.kind === 'playlist' ? parsed.id : null;
}

function toNormalizedTrack(
  item: SpotifyTrackRaw,
  playerId: string,
): NormalizedTrack | null {
  if (!item?.id || !item.name) return null;
  return {
    spotifyTrackId: item.id,
    title: item.name,
    artists: item.artists.map((a) => a.name),
    albumArtUrl: item.album?.images?.[0]?.url ?? null,
    durationMs: item.duration_ms,
    contributedBy: playerId,
  };
}

async function fetchTracksFromPages(
  playerId: string,
  fetchPage: (offset: number, limit: number) => Promise<{
    items: Array<SpotifyTrackRaw | { item: SpotifyTrackRaw | null } | null>;
    next: string | null;
  }>,
): Promise<NormalizedTrack[]> {
  const tracks: NormalizedTrack[] = [];
  const seen = new Set<string>();
  let offset = 0;
  const limit = 50;

  while (tracks.length < MAX_TRACKS_PER_PLAYER) {
    const page = await fetchPage(offset, limit);
    if (!page.items?.length) break;

    for (const entry of page.items) {
      const raw =
        entry && typeof entry === 'object' && 'item' in entry
          ? entry.item
          : (entry as SpotifyTrackRaw | null);
      const track = raw ? toNormalizedTrack(raw, playerId) : null;
      if (!track || seen.has(track.spotifyTrackId)) continue;
      seen.add(track.spotifyTrackId);
      tracks.push(track);
      if (tracks.length >= MAX_TRACKS_PER_PLAYER) break;
    }

    if (!page.next || tracks.length >= MAX_TRACKS_PER_PLAYER) break;
    offset += limit;
  }

  return tracks;
}

export async function importAlbumTracks(
  playerId: string,
  albumId: string,
): Promise<{ tracks: NormalizedTrack[]; sourceName: string }> {
  const meta = await spotifyFetch<{ name: string; images: Array<{ url: string }> }>(
    playerId,
    `/albums/${albumId}?fields=name,images`,
  );

  const tracks = await fetchTracksFromPages(playerId, async (offset, limit) => {
    const page = await spotifyFetch<{
      items: SpotifyTrackRaw[];
      next: string | null;
    }>(
      playerId,
      `/albums/${albumId}/tracks?offset=${offset}&limit=${limit}&fields=items(id,name,artists,album(images),duration_ms)`,
    );
    return { items: page.items, next: page.next };
  });

  if (tracks.length === 0) {
    throw new Error('Album has no importable tracks.');
  }

  if (!tracks[0]!.albumArtUrl && meta.images[0]?.url) {
    for (const t of tracks) {
      t.albumArtUrl = meta.images[0]!.url;
    }
  }

  return { tracks, sourceName: meta.name };
}

export async function importPlaylistTracks(
  playerId: string,
  playlistId: string,
): Promise<{ tracks: NormalizedTrack[]; sourceName: string }> {
  const meta = await spotifyFetch<{ name: string }>(
    playerId,
    `/playlists/${playlistId}?fields=name`,
  );

  const tracks = await fetchTracksFromPages(playerId, async (offset, limit) => {
    const page = await spotifyFetch<{
      items: Array<{ item: SpotifyTrackRaw | null }>;
      next: string | null;
    }>(
      playerId,
      `/playlists/${playlistId}/items?offset=${offset}&limit=${limit}&fields=items(item(id,name,artists,album(images),duration_ms))`,
    );
    return { items: page.items, next: page.next };
  });

  if (tracks.length === 0) {
    throw new Error(
      'Could not read playlist tracks. Try your own playlist, one you collaborate on, a public playlist link, or an album link.',
    );
  }

  return { tracks, sourceName: meta.name };
}

export async function importMusicFromLink(
  playerId: string,
  input: string,
): Promise<{ tracks: NormalizedTrack[]; sourceName: string }> {
  const parsed = parseSpotifyLink(input);
  if (!parsed) {
    throw new Error(
      'Invalid Spotify link. Paste a playlist URL, album URL, or 22-character ID.',
    );
  }

  if (parsed.kind === 'album') {
    return importAlbumTracks(playerId, parsed.id);
  }

  try {
    return await importPlaylistTracks(playerId, parsed.id);
  } catch (playlistErr) {
    if (new RegExp(`^${SPOTIFY_ID}$`).test(input.trim())) {
      try {
        return await importAlbumTracks(playerId, parsed.id);
      } catch {
        throw playlistErr;
      }
    }
    throw playlistErr;
  }
}
