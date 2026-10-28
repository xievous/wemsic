import {
  BETWEEN_ROUNDS_DELAY_MS,
  GAME_START_COUNTDOWN_SECONDS,
  MAX_PLAYERS,
  MIN_PLAYLIST_TRACKS,
} from '@wemsic/shared';
import type { LobbyState, RoomType } from '@wemsic/shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { makeTracks } from '../test/fixtures.js';
import { RoomManager } from './RoomManager.js';

vi.mock('../deezer/preview.js', () => ({
  resolvePreviewUrl: vi.fn(async () => null),
}));

const COUNTDOWN_MS = GAME_START_COUNTDOWN_SECONDS * 1000;
const ROUND_MS = 15_000;

function setup(roomType: RoomType = 'online') {
  const broadcast = vi.fn();
  const rooms = new RoomManager(broadcast);
  const { roomCode, playerId: host } = rooms.createRoom('Host', roomType);
  const joined = rooms.joinRoom(roomCode, 'Guest');
  if ('error' in joined) throw new Error(joined.error);
  const guest = joined.playerId;

  const lobby = () => rooms.getLobbyState(roomCode)!;
  const sent = <T = unknown>(event: string) =>
    broadcast.mock.calls.filter(([, e]) => e === event).map(([, , payload]) => payload as T);

  /** Host contributes a playlist and every competing player readies up. */
  function makeReady() {
    rooms.addPlaylist(roomCode, host, 'pl-1', 'Mix', null, makeTracks(host, 20));
    if (roomType === 'online') rooms.setReady(roomCode, host, true);
    rooms.setReady(roomCode, guest, true);
  }

  async function startAndWait() {
    makeReady();
    expect(rooms.toggleStartCountdown(roomCode, host)).toBeNull();
    await vi.advanceTimersByTimeAsync(COUNTDOWN_MS);
  }

  return { rooms, roomCode, host, guest, lobby, sent, makeReady, startAndWait };
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('RoomManager: joining', () => {
  it('creates a lobby with the creator as host', () => {
    const { lobby, host, sent } = setup();
    expect(lobby()).toMatchObject({ phase: 'lobby', hostPlayerId: host });
    expect(lobby().players.map((p) => p.displayName)).toEqual(['Host', 'Guest']);
    expect(sent('lobby:state').length).toBeGreaterThan(0);
  });

  it('matches room codes case-insensitively', () => {
    const { rooms, roomCode } = setup();
    expect(rooms.joinRoom(roomCode.toLowerCase(), 'Late')).toHaveProperty('playerId');
  });

  it(`refuses joins past ${MAX_PLAYERS} players`, () => {
    const { rooms, roomCode, lobby } = setup();
    while (lobby().players.length < MAX_PLAYERS) rooms.joinRoom(roomCode, 'Filler');
    expect(rooms.joinRoom(roomCode, 'One too many')).toEqual({ error: 'Room is full' });
  });

  it('refuses joins once the game has started', async () => {
    const { rooms, roomCode, startAndWait } = setup();
    await startAndWait();
    expect(rooms.joinRoom(roomCode, 'Late')).toEqual({ error: 'Game already started' });
  });

  it('refuses unknown rooms', () => {
    const { rooms } = setup();
    expect(rooms.joinRoom('NOPE00', 'X')).toEqual({ error: 'Room not found' });
  });

  it.todo('frees the slot of a player who disconnects and never comes back');
});

describe('RoomManager: ready and start rules', () => {
  it(`needs a playlist of at least ${MIN_PLAYLIST_TRACKS} tracks and everyone ready`, () => {
    const { rooms, roomCode, host, guest, lobby } = setup();
    rooms.setReady(roomCode, host, true);
    rooms.setReady(roomCode, guest, true);
    expect(lobby().canStart).toBe(false);

    rooms.addPlaylist(roomCode, guest, 'small', 'Small', null, makeTracks(guest, MIN_PLAYLIST_TRACKS - 1));
    rooms.setReady(roomCode, guest, true);
    expect(lobby().canStart).toBe(false);

    rooms.addPlaylist(roomCode, host, 'big', 'Big', null, makeTracks(host, MIN_PLAYLIST_TRACKS));
    rooms.setReady(roomCode, host, true);
    expect(lobby().canStart).toBe(true);

    rooms.setReady(roomCode, guest, false);
    expect(lobby().canStart).toBe(false);
  });

  it('un-readies a player when they change their playlists', () => {
    const { rooms, roomCode, guest, lobby } = setup();
    rooms.setReady(roomCode, guest, true);
    rooms.addPlaylist(roomCode, guest, 'pl', 'Mine', null, makeTracks(guest, 12));
    expect(lobby().players.find((p) => p.id === guest)?.isReady).toBe(false);
  });

  it('refuses to start before the room is ready', () => {
    const { rooms, roomCode, host } = setup();
    expect(rooms.toggleStartCountdown(roomCode, host)).toMatch(/playlist/);
  });

  it('only lets the host start', () => {
    const { rooms, roomCode, guest, makeReady } = setup();
    makeReady();
    expect(rooms.toggleStartCountdown(roomCode, guest)).toBe('Not host');
  });

  it('starts the game when the countdown finishes', async () => {
    const { rooms, roomCode, host, lobby, sent, makeReady } = setup();
    makeReady();
    rooms.toggleStartCountdown(roomCode, host);
    expect(lobby().startCountdownEndsAt).toBe(Date.now() + COUNTDOWN_MS);

    await vi.advanceTimersByTimeAsync(COUNTDOWN_MS);
    expect(lobby().phase).toBe('playing');
    expect(sent('round:start')).toHaveLength(1);
  });

  it('cancels the countdown when the host taps again', async () => {
    const { rooms, roomCode, host, lobby, makeReady } = setup();
    makeReady();
    rooms.toggleStartCountdown(roomCode, host);
    rooms.toggleStartCountdown(roomCode, host);
    expect(lobby().startCountdownEndsAt).toBeNull();

    await vi.advanceTimersByTimeAsync(COUNTDOWN_MS);
    expect(lobby().phase).toBe('lobby');
  });

  it('cancels the countdown when someone un-readies', async () => {
    const { rooms, roomCode, host, guest, lobby, makeReady } = setup();
    makeReady();
    rooms.toggleStartCountdown(roomCode, host);
    rooms.setReady(roomCode, guest, false);
    expect(lobby().startCountdownEndsAt).toBeNull();

    await vi.advanceTimersByTimeAsync(COUNTDOWN_MS);
    expect(lobby().phase).toBe('lobby');
  });
});

describe('RoomManager: host settings and kicking', () => {
  it('clamps settings and ignores non-hosts', () => {
    const { rooms, roomCode, host, guest, lobby } = setup();
    expect(rooms.updateSettings(roomCode, guest, { roundCount: 12 })).toBe(false);

    rooms.updateSettings(roomCode, host, { roundCount: 100, roundDurationSeconds: 1 });
    expect(lobby().settings).toMatchObject({ roundCount: 30, roundDurationSeconds: 10 });
  });

  it('resets the round length to the new mode default', () => {
    const { rooms, roomCode, host, lobby } = setup();
    rooms.updateSettings(roomCode, host, { gameMode: 'typing' });
    expect(lobby().settings).toMatchObject({ gameMode: 'typing', roundDurationSeconds: 30 });
  });

  it('lets only the host remove other players', () => {
    const { rooms, roomCode, host, guest, lobby } = setup();
    rooms.kickPlayer(roomCode, guest, host);
    rooms.kickPlayer(roomCode, host, host);
    expect(lobby().players).toHaveLength(2);

    rooms.kickPlayer(roomCode, host, guest);
    expect(lobby().players.map((p) => p.id)).toEqual([host]);
  });
});

describe('RoomManager: host screen mode', () => {
  it('lets the presenter start without readying up', () => {
    const { rooms, roomCode, host, lobby, makeReady } = setup('host');
    makeReady();
    expect(lobby().players.find((p) => p.id === host)?.isReady).toBe(false);
    expect(lobby().canStart).toBe(true);
    expect(rooms.toggleStartCountdown(roomCode, host)).toBeNull();
  });

  it('keeps the presenter out of the round and the leaderboard', async () => {
    const { host, guest, sent, startAndWait } = setup('host');
    await startAndWait();

    const [round] = sent<{ players: { playerId: string }[] }>('round:start');
    expect(round!.players.map((p) => p.playerId)).toEqual([guest]);

    await vi.advanceTimersByTimeAsync(ROUND_MS);
    const [reveal] = sent<{ leaderboard: { playerId: string }[] }>('round:reveal');
    expect(reveal!.leaderboard.map((e) => e.playerId)).toEqual([guest]);
    expect(reveal!.leaderboard.some((e) => e.playerId === host)).toBe(false);
  });
});

describe('RoomManager: game end and rematch', () => {
  async function playWholeGame(ctx: ReturnType<typeof setup>) {
    await ctx.startAndWait();
    const rounds = ctx.lobby().settings.roundCount;
    await vi.advanceTimersByTimeAsync(rounds * (ROUND_MS + BETWEEN_ROUNDS_DELAY_MS));
  }

  it('finishes the room after the last round', async () => {
    const ctx = setup();
    await playWholeGame(ctx);
    expect(ctx.lobby().phase).toBe('finished');
    expect(ctx.sent('game:end')).toHaveLength(1);
  });

  it('sends a finished room back to the lobby with scores and ready reset', async () => {
    const ctx = setup();
    await playWholeGame(ctx);

    ctx.rooms.rematch(ctx.roomCode, ctx.guest);
    const state: LobbyState = ctx.lobby();
    expect(state.phase).toBe('lobby');
    expect(state.players.every((p) => p.score === 0 && !p.isReady)).toBe(true);
    expect(state.players.find((p) => p.id === ctx.host)?.playlists).toHaveLength(1);
  });

  // Known bug: a rematch during the pause between rounds leaves the old
  // engine's next-round timer running, so rounds keep arriving in the lobby.
  // Flip to `it` once fixed.
  it.fails('stops the old game when a rematch happens mid-game', async () => {
    const ctx = setup();
    await ctx.startAndWait();
    await vi.advanceTimersByTimeAsync(ROUND_MS);
    expect(ctx.sent('round:reveal')).toHaveLength(1);

    ctx.rooms.rematch(ctx.roomCode, ctx.guest);
    await vi.advanceTimersByTimeAsync(BETWEEN_ROUNDS_DELAY_MS + ROUND_MS);
    expect(ctx.sent('round:start')).toHaveLength(1);
  });
});
