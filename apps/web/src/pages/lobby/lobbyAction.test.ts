import { describe, expect, it } from 'vitest';
import type { LobbyState, Player } from '@wemsic/shared';
import { lobbyAction } from './lobbyAction';

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

const idle = { soundOn: true, countdownLeft: null };

describe('lobbyAction for the online host', () => {
  it('lets the host start without readying first, and readies them on the way', () => {
    const l = lobby([player('Host', { isHost: true, trackCount: 20 }), player('Sam', { isReady: true })]);
    const a = lobbyAction(l, 'Host', idle);
    expect(a).toMatchObject({ kind: 'start', disabled: false, readiesFirst: true, label: 'Start the game' });
  });

  it('stays disabled while someone else isn’t ready, and says who', () => {
    const l = lobby([player('Host', { isHost: true, trackCount: 20 }), player('Sam')]);
    const a = lobbyAction(l, 'Host', idle);
    expect(a.disabled).toBe(true);
    expect(a.status).toBe('Waiting for Sam to ready up');
  });

  it('turns sound on with the start tap when it’s off', () => {
    const l = lobby([player('Host', { isHost: true, isReady: true, trackCount: 20 }), player('Sam', { isReady: true })]);
    const a = lobbyAction(l, 'Host', { soundOn: false, countdownLeft: null });
    expect(a).toMatchObject({ enablesSound: true, readiesFirst: false, label: 'Sound on & start' });
  });

  it('becomes a cancel button during the countdown', () => {
    const l = lobby([player('Host', { isHost: true, isReady: true, trackCount: 20 })]);
    expect(lobbyAction(l, 'Host', { soundOn: true, countdownLeft: 2 })).toMatchObject({
      kind: 'cancel',
      label: 'Starting in 2…',
    });
  });
});

describe('lobbyAction for the host screen', () => {
  it('never asks the presenter to ready up', () => {
    const l = lobby([player('Screen', { isHost: true, trackCount: 20 }), player('Sam', { isReady: true })], 'host');
    expect(lobbyAction(l, 'Screen', idle)).toMatchObject({ kind: 'start', disabled: false, readiesFirst: false });
  });
});

describe('lobbyAction for players', () => {
  it('readies up and turns sound on in one tap online', () => {
    const l = lobby([player('Host', { isHost: true, trackCount: 20 }), player('Sam')]);
    expect(lobbyAction(l, 'Sam', { soundOn: false, countdownLeft: null })).toMatchObject({
      kind: 'ready',
      enablesSound: true,
    });
  });

  it('doesn’t touch sound on a phone in host-screen mode', () => {
    const l = lobby([player('Screen', { isHost: true, trackCount: 20 }), player('Sam')], 'host');
    const a = lobbyAction(l, 'Sam', { soundOn: false, countdownLeft: null });
    expect(a).toMatchObject({ kind: 'ready', enablesSound: false });
    expect(a.status).toBe('Tap ready when your music is in');
  });

  it('asks for sound when already ready but sound is off (after a reload)', () => {
    const l = lobby([player('Host', { isHost: true, trackCount: 20 }), player('Sam', { isReady: true })]);
    expect(lobbyAction(l, 'Sam', { soundOn: false, countdownLeft: null }).kind).toBe('sound');
  });

  it('shows what the room waits for once ready', () => {
    const l = lobby([player('Host', { isHost: true, trackCount: 20 }), player('Sam', { isReady: true })]);
    expect(lobbyAction(l, 'Sam', idle)).toMatchObject({
      kind: 'unready',
      status: 'Waiting for Host to ready up',
    });
  });
});
