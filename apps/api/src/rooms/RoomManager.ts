import {
  DEFAULT_ROUND_COUNT,
  DEFAULT_SPEED_CHOICE_SECONDS,
  DEFAULT_TYPING_SECONDS,
  GAME_START_COUNTDOWN_SECONDS,
  MIN_PLAYLIST_TRACKS,
  MAX_PLAYERS,
} from '@wemsic/shared';
import type {
  GameMode,
  LobbyState,
  NormalizedTrack,
  Player,
  RoomPhase,
  RoomSettings,
  RoomType,
  TypingGuessResult,
} from '@wemsic/shared';
import { nanoid } from 'nanoid';
import { clearSpotifyTokens, getSpotifyTokens } from '../spotify/client.js';
import { generateRoomCode } from '../utils/roomCode.js';
import { GameEngine } from './GameEngine.js';

interface RoomPlayer {
  id: string;
  displayName: string;
  isHost: boolean;
  isReady: boolean;
  spotifyConnected: boolean;
  playlistId: string | null;
  playlistName: string | null;
  tracks: NormalizedTrack[];
  score: number;
}

interface Room {
  code: string;
  phase: RoomPhase;
  hostPlayerId: string;
  settings: RoomSettings;
  players: Map<string, RoomPlayer>;
  engine: GameEngine | null;
  skippedTracksCount: number;
  createdAt: number;
  startCountdownEndsAt: number | null;
  startCountdownTimer: ReturnType<typeof setTimeout> | null;
}

type BroadcastFn = (roomCode: string, event: string, payload: unknown) => void;

export class RoomManager {
  private rooms = new Map<string, Room>();
  private broadcast: BroadcastFn;

  constructor(broadcast: BroadcastFn) {
    this.broadcast = broadcast;
  }

  createRoom(
    hostDisplayName: string,
    roomType: RoomType = 'online',
  ): {
    roomCode: string;
    playerId: string;
    hostPlayerId: string;
  } {
    let code = generateRoomCode();
    while (this.rooms.has(code)) {
      code = generateRoomCode();
    }

    const playerId = nanoid();
    const room: Room = {
      code,
      phase: 'lobby',
      hostPlayerId: playerId,
      settings: {
        gameMode: 'speed_choice',
        roundCount: DEFAULT_ROUND_COUNT,
        roundDurationSeconds: DEFAULT_SPEED_CHOICE_SECONDS,
        roomType,
      },
      players: new Map(),
      engine: null,
      skippedTracksCount: 0,
      createdAt: Date.now(),
      startCountdownEndsAt: null,
      startCountdownTimer: null,
    };

    room.players.set(playerId, this.newPlayer(playerId, hostDisplayName, true));
    this.rooms.set(code, room);
    this.emitLobby(room);

    return { roomCode: code, playerId, hostPlayerId: playerId };
  }

  joinRoom(
    roomCode: string,
    displayName: string,
  ): { playerId: string } | { error: string } {
    const room = this.rooms.get(roomCode.toUpperCase());
    if (!room) return { error: 'Room not found' };
    if (room.phase !== 'lobby') return { error: 'Game already started' };
    if (room.players.size >= MAX_PLAYERS) return { error: 'Room is full' };

    const playerId = nanoid();
    room.players.set(playerId, this.newPlayer(playerId, displayName, false));
    this.emitLobby(room);
    return { playerId };
  }

  getRoom(roomCode: string): Room | undefined {
    return this.rooms.get(roomCode.toUpperCase());
  }

  leaveRoom(roomCode: string, playerId: string): void {
    const room = this.rooms.get(roomCode.toUpperCase());
    if (!room) return;

    room.players.delete(playerId);
    clearSpotifyTokens(playerId);

    if (room.players.size === 0) {
      room.engine?.destroy();
      this.rooms.delete(room.code);
      return;
    }

    if (room.hostPlayerId === playerId) {
      const next = room.players.keys().next().value as string;
      room.hostPlayerId = next;
      room.players.get(next)!.isHost = true;
    }

    this.emitLobby(room);
  }

  /**
   * Host removes a player from the room. Works in the pre-game lobby and in the
   * post-game rematch waiting room. The host cannot remove themselves.
   */
  kickPlayer(roomCode: string, hostPlayerId: string, targetPlayerId: string): void {
    const room = this.rooms.get(roomCode.toUpperCase());
    if (!room || room.hostPlayerId !== hostPlayerId) return;
    if (targetPlayerId === hostPlayerId) return;
    if (!room.players.has(targetPlayerId)) return;

    room.players.delete(targetPlayerId);
    clearSpotifyTokens(targetPlayerId);
    this.emitLobby(room);
  }

  /**
   * Send a finished room back to the lobby for a rematch. Players, their
   * playlists and Spotify connections are kept; scores and ready states reset.
   * Any player may trigger it; repeated calls once back in the lobby are no-ops.
   */
  rematch(roomCode: string, playerId: string): void {
    const room = this.rooms.get(roomCode.toUpperCase());
    if (!room || !room.players.has(playerId)) return;
    if (room.phase === 'lobby') return;

    room.engine?.destroy();
    room.engine = null;
    room.phase = 'lobby';
    room.skippedTracksCount = 0;
    if (room.startCountdownTimer) {
      clearTimeout(room.startCountdownTimer);
      room.startCountdownTimer = null;
    }
    room.startCountdownEndsAt = null;
    for (const p of room.players.values()) {
      p.score = 0;
      p.isReady = false;
    }
    this.emitLobby(room);
  }

  setSpotifyConnected(roomCode: string, playerId: string, connected: boolean): void {
    const player = this.getPlayer(roomCode, playerId);
    if (!player) return;
    player.spotifyConnected = connected;
    this.emitLobby(this.rooms.get(roomCode.toUpperCase())!);
  }

  setPlaylist(
    roomCode: string,
    playerId: string,
    playlistId: string,
    playlistName: string,
    tracks: NormalizedTrack[],
  ): void {
    const player = this.getPlayer(roomCode, playerId);
    if (!player) return;
    player.playlistId = playlistId;
    player.playlistName = playlistName;
    player.tracks = tracks.map((t) => ({ ...t, contributedBy: playerId }));
    player.isReady = false;
    this.emitLobby(this.rooms.get(roomCode.toUpperCase())!);
  }

  setReady(roomCode: string, playerId: string, ready: boolean): void {
    const player = this.getPlayer(roomCode, playerId);
    if (!player) return;
    // A player no longer needs their own playlist to ready up. As long as
    // someone in the room has contributed a playlist, everyone can ready.
    player.isReady = ready;
    this.emitLobby(this.rooms.get(roomCode.toUpperCase())!);
  }

  updateSettings(
    roomCode: string,
    hostPlayerId: string,
    settings: Partial<RoomSettings>,
  ): boolean {
    const room = this.rooms.get(roomCode.toUpperCase());
    if (!room || room.hostPlayerId !== hostPlayerId) return false;
    if (room.phase !== 'lobby') return false;

    if (settings.gameMode) {
      room.settings.gameMode = settings.gameMode;
      room.settings.roundDurationSeconds =
        settings.gameMode === 'typing'
          ? DEFAULT_TYPING_SECONDS
          : DEFAULT_SPEED_CHOICE_SECONDS;
    }
    if (settings.roundCount !== undefined) {
      room.settings.roundCount = Math.min(30, Math.max(5, settings.roundCount));
    }
    if (settings.roundDurationSeconds !== undefined) {
      room.settings.roundDurationSeconds = Math.min(
        60,
        Math.max(10, settings.roundDurationSeconds),
      );
    }

    this.emitLobby(room);
    return true;
  }

  /**
   * In host mode the host runs the shared screen as a presenter: they don't
   * answer, score, or appear on the leaderboard. In online mode everyone
   * (including the host) competes.
   */
  private isPresenter(room: Room, playerId: string): boolean {
    return room.settings.roomType === 'host' && playerId === room.hostPlayerId;
  }

  private competingPlayerEntries(room: Room): [string, RoomPlayer][] {
    return [...room.players.entries()].filter(
      ([id]) => !this.isPresenter(room, id),
    );
  }

  canStart(room: Room): boolean {
    if (room.players.size < 1) return false;
    // At least one playlist must exist in the room (the presenter may add one too)...
    const hasPlaylist = [...room.players.values()].some(
      (p) => p.tracks.length >= MIN_PLAYLIST_TRACKS,
    );
    if (!hasPlaylist) return false;
    // ...there must be at least one competing player...
    const competitors = this.competingPlayerEntries(room).map(([, p]) => p);
    if (competitors.length < 1) return false;
    // ...and every competing player is ready (the host presenter is exempt).
    return competitors.every((p) => p.isReady);
  }

  toggleStartCountdown(
    roomCode: string,
    hostPlayerId: string,
  ): string | null {
    const room = this.rooms.get(roomCode.toUpperCase());
    if (!room || room.hostPlayerId !== hostPlayerId) return 'Not host';
    if (room.phase !== 'lobby') return 'Game already started';

    if (room.startCountdownEndsAt !== null) {
      this.cancelStartCountdown(room);
      return null;
    }

    if (!this.canStart(room)) {
      return 'Add at least one playlist and make sure everyone is ready';
    }

    room.startCountdownEndsAt =
      Date.now() + GAME_START_COUNTDOWN_SECONDS * 1000;
    room.startCountdownTimer = setTimeout(() => {
      room.startCountdownTimer = null;
      room.startCountdownEndsAt = null;
      void this.startGame(room.code, hostPlayerId);
    }, GAME_START_COUNTDOWN_SECONDS * 1000);

    this.emitLobby(room);
    return null;
  }

  private cancelStartCountdown(room: Room): void {
    if (room.startCountdownTimer) {
      clearTimeout(room.startCountdownTimer);
      room.startCountdownTimer = null;
    }
    room.startCountdownEndsAt = null;
    this.emitLobby(room);
  }

  async startGame(roomCode: string, hostPlayerId: string): Promise<string | null> {
    const room = this.rooms.get(roomCode.toUpperCase());
    if (!room || room.hostPlayerId !== hostPlayerId) return 'Not host';
    if (room.startCountdownTimer) {
      clearTimeout(room.startCountdownTimer);
      room.startCountdownTimer = null;
    }
    room.startCountdownEndsAt = null;
    if (!this.canStart(room)) {
      return 'Add at least one playlist and make sure everyone is ready';
    }

    const allTracks: NormalizedTrack[] = [];
    for (const p of room.players.values()) {
      if (p.tracks.length >= MIN_PLAYLIST_TRACKS) {
        allTracks.push(...p.tracks);
      }
    }

    // Flip to "playing" and broadcast immediately so every client navigates
    // into the game right away. Previews are resolved lazily per-round by the
    // engine (with caching), so we no longer block the start on a slow,
    // sequential pre-pass over every track.
    room.skippedTracksCount = 0;
    room.phase = 'playing';

    // The presenter (host in host mode) contributes tracks but does not compete,
    // so they're excluded from the engine's player set entirely.
    const competing = this.competingPlayerEntries(room);
    const playerIds = competing.map(([id]) => id);
    const displayNames = new Map(
      competing.map(([id, p]) => [id, p.displayName]),
    );

    const engine = new GameEngine(
      allTracks,
      room.settings.gameMode,
      room.settings.roundCount,
      room.settings.roundDurationSeconds * 1000,
      playerIds,
      {
        onRoundStart: (payload) => {
          this.broadcast(room.code, 'round:start', payload);
        },
        onRoundProgress: (payload) => {
          this.broadcast(room.code, 'round:progress', payload);
        },
        onRoundReveal: (payload) => {
          for (const [id, pts] of Object.entries(payload.roundScores)) {
            const pl = room.players.get(id);
            if (pl) pl.score += pts;
          }

          this.broadcast(room.code, 'round:reveal', {
            ...payload,
            leaderboard: this.competingPlayerEntries(room)
              .map(([playerId, p]) => ({
                playerId,
                displayName: p.displayName,
                score: p.score,
              }))
              .sort((a, b) => b.score - a.score),
          });
        },
        onGameEnd: (leaderboard) => {
          room.phase = 'finished';
          room.engine?.destroy();
          room.engine = null;
          this.broadcast(room.code, 'game:end', {
            leaderboard: this.competingPlayerEntries(room)
              .map(([playerId, p]) => ({
                playerId,
                displayName: p.displayName,
                score: p.score,
              }))
              .sort((a, b) => b.score - a.score),
            winnerId: leaderboard[0]?.playerId ?? null,
          });
        },
      },
    );

    engine.setDisplayNames(displayNames);
    room.engine = engine;
    this.emitLobby(room);
    await engine.start();
    return null;
  }

  submitMcqAnswer(
    roomCode: string,
    playerId: string,
    optionId: string,
  ): boolean {
    const room = this.rooms.get(roomCode.toUpperCase());
    if (!room?.engine) return false;
    return room.engine.submitMcqAnswer(playerId, optionId);
  }

  submitTypingGuess(
    roomCode: string,
    playerId: string,
    guess: string,
  ): TypingGuessResult {
    const room = this.rooms.get(roomCode.toUpperCase());
    if (!room?.engine) {
      return {
        incorrect: true,
        matchedArtist: false,
        matchedTitle: false,
        artistCorrect: false,
        titleCorrect: false,
        bothCorrect: false,
      };
    }
    return room.engine.submitTypingGuess(playerId, guess);
  }

  getLobbyState(roomCode: string): LobbyState | null {
    const room = this.rooms.get(roomCode.toUpperCase());
    if (!room) return null;
    return this.toLobbyState(room);
  }

  reconnectPlayer(
    roomCode: string,
    playerId: string,
  ): LobbyState | { error: string } {
    const room = this.rooms.get(roomCode.toUpperCase());
    if (!room) return { error: 'Room not found' };
    if (!room.players.has(playerId)) return { error: 'Player not in room' };
    return this.toLobbyState(room);
  }

  isSpotifyConnected(playerId: string): boolean {
    return getSpotifyTokens(playerId) !== null;
  }

  private getPlayer(roomCode: string, playerId: string): RoomPlayer | undefined {
    return this.rooms.get(roomCode.toUpperCase())?.players.get(playerId);
  }

  private newPlayer(id: string, displayName: string, isHost: boolean): RoomPlayer {
    return {
      id,
      displayName,
      isHost,
      isReady: false,
      spotifyConnected: false,
      playlistId: null,
      playlistName: null,
      tracks: [],
      score: 0,
    };
  }

  private toLobbyState(room: Room): LobbyState {
    const players: Player[] = [...room.players.values()].map((p) => ({
      id: p.id,
      displayName: p.displayName,
      isHost: p.id === room.hostPlayerId,
      isReady: p.isReady,
      spotifyConnected: p.spotifyConnected || this.isSpotifyConnected(p.id),
      playlistId: p.playlistId,
      playlistName: p.playlistName,
      trackCount: p.tracks.length,
      score: p.score,
    }));

    return {
      roomCode: room.code,
      phase: room.phase,
      hostPlayerId: room.hostPlayerId,
      settings: { ...room.settings },
      players,
      canStart: this.canStart(room),
      skippedTracksCount: room.skippedTracksCount,
      startCountdownEndsAt: room.startCountdownEndsAt,
    };
  }

  private emitLobby(room: Room): void {
    if (
      room.startCountdownEndsAt !== null &&
      room.phase === 'lobby' &&
      !this.canStart(room)
    ) {
      this.cancelStartCountdown(room);
      return;
    }
    this.broadcast(room.code, 'lobby:state', this.toLobbyState(room));
  }
}
