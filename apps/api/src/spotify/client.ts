import { MAX_TRACKS_PER_PLAYER } from '@wemsic/shared';
import type { NormalizedTrack } from '@wemsic/shared';
import { config } from '../config.js';
import type { SpotifyPlaylistSummary, SpotifyTokens, SpotifyTrackRaw } from './types.js';

const tokenStore = new Map<string, SpotifyTokens>();
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

export function parsePlaylistId(input: string): string | null {
  const trimmed = input.trim();
  if (/^[a-zA-Z0-9]{22}$/.test(trimmed)) return trimmed;
  const match = trimmed.match(/playlist\/([a-zA-Z0-9]{22})/);
  return match?.[1] ?? null;
}

export async function importPlaylistTracks(
  playerId: string,
  playlistId: string,
): Promise<{ tracks: NormalizedTrack[]; playlistName: string }> {
  const meta = await spotifyFetch<{ name: string }>(
    playerId,
    `/playlists/${playlistId}?fields=name`,
  );

  const tracks: NormalizedTrack[] = [];
  const seen = new Set<string>();
  let offset = 0;
  const limit = 50;

  while (tracks.length < MAX_TRACKS_PER_PLAYER) {
    const page = await spotifyFetch<{
      items: Array<{ item: SpotifyTrackRaw | null }>;
      next: string | null;
    }>(
      playerId,
      `/playlists/${playlistId}/items?offset=${offset}&limit=${limit}&fields=items(item(id,name,artists,album(images),duration_ms))`,
    );

    if (!page.items?.length) {
      if (offset === 0) {
        throw new Error(
          'Could not read playlist tracks. You can only import playlists you own or collaborate on.',
        );
      }
      break;
    }

    for (const entry of page.items) {
      const item = entry.item;
      if (!item?.id || !item.name) continue;
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      tracks.push({
        spotifyTrackId: item.id,
        title: item.name,
        artists: item.artists.map((a) => a.name),
        albumArtUrl: item.album.images[0]?.url ?? null,
        durationMs: item.duration_ms,
        contributedBy: playerId,
      });
      if (tracks.length >= MAX_TRACKS_PER_PLAYER) break;
    }

    if (!page.next || tracks.length >= MAX_TRACKS_PER_PLAYER) break;
    offset += limit;
  }

  return { tracks, playlistName: meta.name };
}
