import { describe, expect, it } from 'vitest';
import type { LobbyState, Player } from '@wemsic/shared';
import { startBlocker } from './startStatus';

function player(id: string, overrides: Partial<Player> = {}): Player {
  return {
    id,
    displayName: id,
    isHost: false,
    isReady: false,
    connected: true,
    playlists: [],
    trackCount: 0,
    score: 0,
    colorIndex: 0,
    initials: id.slice(0, 2).toUpperCase(),
    ...overrides,
  };
}

function lobby(players: Player[], roomType: 'online' | 'host' = 'online'): LobbyState {
  return {
    roomCode: 'ABCDEF',
    phase: 'lobby',
    hostPlayerId: players[0]!.id,
    settings: { roomType } as LobbyState['settings'],
    players,
    canStart: false,
  };
}

describe('startBlocker', () => {
  it('asks for a playlist first', () => {
    const l = lobby([player('Host', { isHost: true, isReady: true, trackCount: 5 })]);
    expect(startBlocker(l, 'Host')).toBe('Add a playlist to start');
  });

  it('is clear once everyone online is ready', () => {
    const l = lobby([
      player('Host', { isHost: true, isReady: true, trackCount: 20 }),
      player('Sam', { isReady: true }),
    ]);
    expect(startBlocker(l, 'Host')).toBeNull();
  });

  it('names who still has to ready up, you first', () => {
    const l = lobby([
      player('Host', { isHost: true, trackCount: 20 }),
      player('Sam'),
      player('Alex', { isReady: true }),
    ]);
    expect(startBlocker(l, 'Host')).toBe('Waiting for you and Sam to ready up');
    expect(startBlocker(l, 'Alex')).toBe('Waiting for Host and Sam to ready up');
  });

  it('shortens a long list', () => {
    const l = lobby([
      player('Host', { isHost: true, isReady: true, trackCount: 20 }),
      player('A'),
      player('B'),
      player('C'),
      player('D'),
    ]);
    expect(startBlocker(l, 'Host')).toBe('Waiting for A, B and 2 others to ready up');
  });

  it('ignores offline players, like the server does', () => {
    const l = lobby([
      player('Host', { isHost: true, isReady: true, trackCount: 20 }),
      player('Gone', { connected: false }),
    ]);
    expect(startBlocker(l, 'Host')).toBeNull();
  });

  it('never waits on the host-screen presenter', () => {
    const l = lobby(
      [player('Screen', { isHost: true, trackCount: 20 }), player('Sam', { isReady: true })],
      'host',
    );
    expect(startBlocker(l, 'Screen')).toBeNull();
  });

  it('waits for someone to join a host-screen room', () => {
    const l = lobby([player('Screen', { isHost: true, trackCount: 20 })], 'host');
    expect(startBlocker(l, 'Screen')).toBe('Waiting for players to join');
  });
});
