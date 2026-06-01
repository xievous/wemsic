import type { LobbyState } from '@wemsic/shared';
import { API_URL } from '../config';

export async function createRoomWithHost(displayName: string) {
  const res = await fetch(`${API_URL}/rooms/create-with-host`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ displayName }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? 'Failed to create room');
  return data as {
    roomCode: string;
    playerId: string;
    hostPlayerId: string;
  };
}

export async function joinRoom(roomCode: string, displayName: string) {
  const res = await fetch(`${API_URL}/rooms/${roomCode}/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ displayName }),
  });
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error ?? 'Failed to join');
  return data as { playerId: string };
}

export async function getRoom(roomCode: string) {
  const res = await fetch(`${API_URL}/rooms/${roomCode}`);
  return res.json() as Promise<LobbyState | { error: string }>;
}

export async function fetchSpotifyPlaylists(playerId: string) {
  const res = await fetch(
    `${API_URL}/spotify/playlists?playerId=${encodeURIComponent(playerId)}`,
  );
  return res.json() as Promise<{
    playlists?: Array<{
      id: string;
      name: string;
      trackCount: number;
      imageUrl: string | null;
    }>;
    error?: string;
  }>;
}

export async function importPlaylist(
  roomCode: string,
  playerId: string,
  playlistId: string,
) {
  const res = await fetch(`${API_URL}/rooms/${roomCode}/playlists`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerId, playlistId }),
  });
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error ?? 'Import failed');
  return data as { trackCount: number; playlistName: string };
}

export function spotifyLoginUrl(playerId: string, roomCode: string) {
  return `${API_URL}/auth/spotify/login?playerId=${encodeURIComponent(playerId)}&roomCode=${encodeURIComponent(roomCode)}`;
}

export async function reconnect(roomCode: string, playerId: string) {
  const res = await fetch(`${API_URL}/rooms/reconnect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ roomCode, playerId }),
  });
  return res.json() as Promise<LobbyState | { error: string }>;
}
