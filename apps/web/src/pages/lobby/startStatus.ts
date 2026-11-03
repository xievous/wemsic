import { MIN_PLAYLIST_TRACKS } from '@wemsic/shared';
import type { LobbyState } from '@wemsic/shared';

/**
 * Why the game can't start yet, in words, or null when nothing is in the way.
 * Mirrors the server's canStart rules (which stay the authority): a playlist
 * somewhere in the room, at least one online competitor, and every online
 * competitor ready. The host-screen presenter never competes.
 */
export function startBlocker(lobby: LobbyState, myPlayerId: string): string | null {
  if (!lobby.players.some((p) => p.trackCount >= MIN_PLAYLIST_TRACKS)) {
    return 'Add a playlist to start';
  }

  const presenterId = lobby.settings.roomType === 'host' ? lobby.hostPlayerId : null;
  const competitors = lobby.players.filter((p) => p.id !== presenterId && p.connected);
  if (competitors.length === 0) return 'Waiting for players to join';

  const notReady = competitors.filter((p) => !p.isReady);
  if (notReady.length === 0) return null;

  const meWaiting = notReady.some((p) => p.id === myPlayerId);
  const names = [
    ...(meWaiting ? ['you'] : []),
    ...notReady.filter((p) => p.id !== myPlayerId).map((p) => p.displayName),
  ];
  return `Waiting for ${listNames(names)} to ready up`;
}

/** "you", "you and Sam", "Sam, Alex and 2 others". */
function listNames(names: string[]): string {
  if (names.length <= 2) return names.join(' and ');
  const others = names.length - 2;
  return `${names[0]}, ${names[1]} and ${others} other${others === 1 ? '' : 's'}`;
}
