import {
  AWAY_PLAYER_REMOVAL_MS,
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
  // What the socket handler does when each player's page joins the room.
  rooms.playerConnected(roomCode, host, `socket-${host}`);
  rooms.playerConnected(roomCode, guest, `socket-${guest}`);

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
    while (lobby().players.length < MAX_PLAYERS) {
      rooms.joinRoom(roomCode, `Filler ${lobby().players.length}`);
    }
    expect(rooms.joinRoom(roomCode, 'One too many')).toEqual({ error: 'Room is full' });
  });

  it('refuses joins once the game has started', async () => {
    const { rooms, roomCode, startAndWait } = setup();
    await startAndWait();
    expect(rooms.joinRoom(roomCode, 'Late')).toEqual({ error: 'Game already started' });
  });

  it('refuses a name someone in the room already has, ignoring case and spaces', () => {
    const { rooms, roomCode, lobby } = setup();
    expect(rooms.joinRoom(roomCode, '  guest ')).toEqual({
      error: 'Someone here is already called Guest. Pick another name.',
    });
    expect(lobby().players).toHaveLength(2);
    expect(rooms.joinRoom(roomCode, 'Guest 2')).toHaveProperty('playerId');
  });

  it('refuses unknown rooms', () => {
    const { rooms } = setup();
    expect(rooms.joinRoom('NOPE00', 'X')).toEqual({ error: 'Room not found' });
  });

});

describe('RoomManager: leaving and offline players', () => {
  const player = (ctx: ReturnType<typeof setup>, id: string) =>
    ctx.lobby().players.find((p) => p.id === id);

  it('shows who is online', () => {
    const ctx = setup();
    expect(player(ctx, ctx.guest)?.connected).toBe(true);

    ctx.rooms.playerDisconnected(ctx.roomCode, ctx.guest, `socket-${ctx.guest}`);
    expect(player(ctx, ctx.guest)?.connected).toBe(false);
  });

  it('keeps a player online while any of their tabs is open', () => {
    const ctx = setup();
    ctx.rooms.playerConnected(ctx.roomCode, ctx.guest, 'second-tab');
    ctx.rooms.playerDisconnected(ctx.roomCode, ctx.guest, `socket-${ctx.guest}`);
    expect(player(ctx, ctx.guest)?.connected).toBe(true);
  });

  it("doesn't let an offline player block the start", () => {
    const ctx = setup();
    ctx.rooms.addPlaylist(ctx.roomCode, ctx.host, 'pl', 'Mix', null, makeTracks(ctx.host, 12));
    ctx.rooms.setReady(ctx.roomCode, ctx.host, true);
    expect(ctx.lobby().canStart).toBe(false);

    ctx.rooms.playerDisconnected(ctx.roomCode, ctx.guest, `socket-${ctx.guest}`);
    expect(ctx.lobby().canStart).toBe(true);
  });

  it('removes a player who stays offline, freeing their slot', async () => {
    const ctx = setup();
    ctx.rooms.playerDisconnected(ctx.roomCode, ctx.guest, `socket-${ctx.guest}`);
    await vi.advanceTimersByTimeAsync(AWAY_PLAYER_REMOVAL_MS - 1);
    expect(player(ctx, ctx.guest)).toBeDefined();

    await vi.advanceTimersByTimeAsync(1);
    expect(player(ctx, ctx.guest)).toBeUndefined();
  });

  it('keeps a player who comes back in time', async () => {
    const ctx = setup();
    ctx.rooms.playerDisconnected(ctx.roomCode, ctx.guest, `socket-${ctx.guest}`);
    await vi.advanceTimersByTimeAsync(AWAY_PLAYER_REMOVAL_MS - 1000);
    ctx.rooms.playerConnected(ctx.roomCode, ctx.guest, 'new-socket');
    await vi.advanceTimersByTimeAsync(AWAY_PLAYER_REMOVAL_MS);
    expect(player(ctx, ctx.guest)?.connected).toBe(true);
  });

  it('removes a player whose page never connected', async () => {
    const ctx = setup();
    const late = ctx.rooms.joinRoom(ctx.roomCode, 'Closed the tab');
    if ('error' in late) throw new Error(late.error);
    await vi.advanceTimersByTimeAsync(AWAY_PLAYER_REMOVAL_MS);
    expect(player(ctx, late.playerId)).toBeUndefined();
  });

  it('keeps an offline player in a running game so they can come back', async () => {
    const ctx = setup();
    await ctx.startAndWait();
    ctx.rooms.playerDisconnected(ctx.roomCode, ctx.guest, `socket-${ctx.guest}`);
    await vi.advanceTimersByTimeAsync(AWAY_PLAYER_REMOVAL_MS + 1000);
    expect(ctx.lobby().phase).toBe('playing');
    expect(player(ctx, ctx.guest)).toBeDefined();
  });

  it('hands the host role to an online player when the host leaves', () => {
    const ctx = setup();
    const third = ctx.rooms.joinRoom(ctx.roomCode, 'Third');
    if ('error' in third) throw new Error(third.error);
    ctx.rooms.playerConnected(ctx.roomCode, third.playerId, 'socket-third');
    ctx.rooms.playerDisconnected(ctx.roomCode, ctx.guest, `socket-${ctx.guest}`);

    ctx.rooms.leaveRoom(ctx.roomCode, ctx.host);
    expect(ctx.lobby().hostPlayerId).toBe(third.playerId);
    expect(player(ctx, third.playerId)?.isHost).toBe(true);
  });

  it('closes the room when the last player leaves', () => {
    const ctx = setup();
    ctx.rooms.leaveRoom(ctx.roomCode, ctx.guest);
    ctx.rooms.leaveRoom(ctx.roomCode, ctx.host);
    expect(ctx.rooms.getLobbyState(ctx.roomCode)).toBeNull();
  });

  it(`lets someone take a freed slot in a full room`, async () => {
    const ctx = setup();
    while (ctx.lobby().players.length < MAX_PLAYERS) {
      ctx.rooms.joinRoom(ctx.roomCode, `Filler ${ctx.lobby().players.length}`);
    }
    expect(ctx.rooms.joinRoom(ctx.roomCode, 'Waiting')).toEqual({ error: 'Room is full' });

    ctx.rooms.leaveRoom(ctx.roomCode, ctx.guest);
    expect(ctx.rooms.joinRoom(ctx.roomCode, 'Waiting')).toHaveProperty('playerId');
  });
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

describe('RoomManager: catching up a player who reconnects', () => {
  const events = (ctx: ReturnType<typeof setup>) =>
    ctx.rooms.getCatchUpEvents(ctx.roomCode).map((e) => e.event);

  it('has nothing to send before the game starts', () => {
    expect(events(setup())).toEqual([]);
  });

  it('sends the current round with its latest progress', async () => {
    const ctx = setup();
    await ctx.startAndWait();
    const round = ctx.sent<{ options: { id: string }[] }>('round:start')[0]!;
    ctx.rooms.submitMcqAnswer(ctx.roomCode, ctx.guest, round.options[0]!.id);

    const [start, progress] = ctx.rooms.getCatchUpEvents(ctx.roomCode);
    expect(start).toEqual({ event: 'round:start', payload: round });
    expect(progress).toEqual({ event: 'round:progress', payload: ctx.sent('round:progress').at(-1) });
  });

  it('sends the reveal between rounds, then the next round', async () => {
    const ctx = setup();
    await ctx.startAndWait();
    await vi.advanceTimersByTimeAsync(ROUND_MS);
    expect(events(ctx)).toEqual(['round:reveal']);

    await vi.advanceTimersByTimeAsync(BETWEEN_ROUNDS_DELAY_MS);
    expect(events(ctx)).toEqual(['round:start', 'round:progress']);
  });

  it('sends the final scores once the game is over, and nothing after a rematch', async () => {
    const ctx = setup();
    await ctx.startAndWait();
    await vi.advanceTimersByTimeAsync(ctx.lobby().settings.roundCount * (ROUND_MS + BETWEEN_ROUNDS_DELAY_MS));
    expect(events(ctx)).toEqual(['game:end']);

    ctx.rooms.rematch(ctx.roomCode, ctx.host);
    expect(events(ctx)).toEqual([]);
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
    expect(ctx.sent('game:end')).toEqual([
      expect.objectContaining({ reason: 'completed', roundsPlayed: 10, totalRounds: 10 }),
    ]);
  });

  it('tells players the game ended because no song had a preview', async () => {
    const ctx = setup();
    ctx.rooms.addPlaylist(
      ctx.roomCode,
      ctx.host,
      'no-previews',
      'Apple mix',
      null,
      makeTracks(ctx.host, 12).map((t) => ({ ...t, previewUrl: null })),
    );
    ctx.rooms.setReady(ctx.roomCode, ctx.host, true);
    ctx.rooms.setReady(ctx.roomCode, ctx.guest, true);
    ctx.rooms.toggleStartCountdown(ctx.roomCode, ctx.host);
    await vi.advanceTimersByTimeAsync(COUNTDOWN_MS);

    expect(ctx.lobby().phase).toBe('finished');
    expect(ctx.sent('game:end')).toEqual([
      expect.objectContaining({ reason: 'out_of_tracks', roundsPlayed: 0 }),
    ]);
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

  it('stops the old game when a rematch happens mid-game', async () => {
    const ctx = setup();
    await ctx.startAndWait();
    await vi.advanceTimersByTimeAsync(ROUND_MS);
    expect(ctx.sent('round:reveal')).toHaveLength(1);

    ctx.rooms.rematch(ctx.roomCode, ctx.guest);
    await vi.advanceTimersByTimeAsync(BETWEEN_ROUNDS_DELAY_MS + ROUND_MS);
    expect(ctx.sent('round:start')).toHaveLength(1);
  });
});
