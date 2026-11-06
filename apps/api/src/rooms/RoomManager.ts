import {
  AWAY_PLAYER_REMOVAL_MS,
  DEFAULT_ROUND_COUNT,
  DEFAULT_SPEED_CHOICE_SECONDS,
  DEFAULT_TYPING_SECONDS,
  DEFAULT_TYPING_SPELLING_LENIENCY,
  GAME_START_COUNTDOWN_SECONDS,
  MIN_PLAYLIST_TRACKS,
  MAX_PLAYERS,
} from '@wemsic/shared';
import type {
  GameEndPayload,
  GameMode,
  LobbyState,
  NormalizedTrack,
  Player,
  RoomPhase,
  RoomSettings,
  RoomType,
  TypingGuessResult,
  TypingSpellingLeniency,
} from '@wemsic/shared';
import { nanoid } from 'nanoid';
import { generateRoomCode } from '../utils/roomCode.js';
import { GameEngine } from './GameEngine.js';

interface PlayerPlaylistEntry {
  id: string;
  name: string;
  thumbnailUrl: string | null;
  tracks: NormalizedTrack[];
}

interface RoomPlayer {
  id: string;
  displayName: string;
  isHost: boolean;
  isReady: boolean;
  playlists: PlayerPlaylistEntry[];
  score: number;
  /** Open socket ids; the player is online while this isn't empty. */
  sockets: Set<string>;
  awayTimer: ReturnType<typeof setTimeout> | null;
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
  /** Latest game events, re-sent to players who (re)join mid-game. */
  catchUp: GameEvent[];
}

interface GameEvent {
  event: string;
  payload: unknown;
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
        typingSpellingLeniency: DEFAULT_TYPING_SPELLING_LENIENCY,
        showOthersGuesses: false,
        questionSet: 'song',
        roomType,
      },
      players: new Map(),
      engine: null,
      skippedTracksCount: 0,
      createdAt: Date.now(),
      startCountdownEndsAt: null,
      startCountdownTimer: null,
      catchUp: [],
    };

    room.players.set(playerId, this.newPlayer(playerId, hostDisplayName, true));
    this.rooms.set(code, room);
    this.startAwayTimer(room, playerId);
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
    // Two Sams make the scoreboard and "Added by" ambiguous.
    const taken = [...room.players.values()].find((p) => sameName(p.displayName, displayName));
    if (taken) {
      return { error: `Someone here is already called ${taken.displayName}. Pick another name.` };
    }

    const playerId = nanoid();
    room.players.set(playerId, this.newPlayer(playerId, displayName, false));
    // Offline until their socket joins; a tab closed before that is cleaned up.
    this.startAwayTimer(room, playerId);
    this.emitLobby(room);
    return { playerId };
  }

  getRoom(roomCode: string): Room | undefined {
    return this.rooms.get(roomCode.toUpperCase());
  }

  leaveRoom(roomCode: string, playerId: string): void {
    const room = this.rooms.get(roomCode.toUpperCase());
    const player = room?.players.get(playerId);
    if (!room || !player) return;

    this.clearAwayTimer(player);
    room.players.delete(playerId);

    if (room.players.size === 0) {
      room.engine?.destroy();
      if (room.startCountdownTimer) clearTimeout(room.startCountdownTimer);
      this.rooms.delete(room.code);
      return;
    }

    if (room.hostPlayerId === playerId) {
      const players = [...room.players.values()];
      const next = players.find((p) => p.sockets.size > 0) ?? players[0]!;
      room.hostPlayerId = next.id;
      next.isHost = true;
    }

    this.emitLobby(room);
  }

  /** One of the player's sockets joined the room. */
  playerConnected(roomCode: string, playerId: string, socketId: string): void {
    const room = this.rooms.get(roomCode.toUpperCase());
    const player = room?.players.get(playerId);
    if (!room || !player) return;

    const wasOnline = player.sockets.size > 0;
    player.sockets.add(socketId);
    this.clearAwayTimer(player);
    if (!wasOnline) this.emitLobby(room);
  }

  /** One of the player's sockets went away; with none left they're offline. */
  playerDisconnected(roomCode: string, playerId: string, socketId: string): void {
    const room = this.rooms.get(roomCode.toUpperCase());
    const player = room?.players.get(playerId);
    if (!room || !player || !player.sockets.delete(socketId)) return;
    if (player.sockets.size > 0) return;

    this.startAwayTimer(room, playerId);
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
    const target = room.players.get(targetPlayerId);
    if (!target) return;

    this.clearAwayTimer(target);
    room.players.delete(targetPlayerId);
    this.emitLobby(room);
  }

  /**
   * Send a finished room back to the lobby for a rematch. Players, their
   * playlists are kept; scores and ready states reset.
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
    room.catchUp = [];
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

  addPlaylist(
    roomCode: string,
    playerId: string,
    playlistId: string,
    playlistName: string,
    thumbnailUrl: string | null,
    tracks: NormalizedTrack[],
  ): boolean {
    const player = this.getPlayer(roomCode, playerId);
    if (!player) return false;

    const normalizedTracks = tracks.map((t) => ({ ...t, contributedBy: playerId }));
    const thumb = thumbnailUrl ?? normalizedTracks[0]?.albumArtUrl ?? null;
    const entry: PlayerPlaylistEntry = {
      id: playlistId,
      name: playlistName,
      thumbnailUrl: thumb,
      tracks: normalizedTracks,
    };

    const existingIdx = player.playlists.findIndex((p) => p.id === playlistId);
    if (existingIdx >= 0) {
      player.playlists[existingIdx] = entry;
    } else {
      player.playlists.push(entry);
    }

    player.isReady = false;
    this.emitLobby(this.rooms.get(roomCode.toUpperCase())!);
    return true;
  }

  removePlaylist(roomCode: string, playerId: string, playlistId: string): boolean {
    const player = this.getPlayer(roomCode, playerId);
    if (!player) return false;

    const before = player.playlists.length;
    player.playlists = player.playlists.filter((p) => p.id !== playlistId);
    if (player.playlists.length === before) return false;

    player.isReady = false;
    this.emitLobby(this.rooms.get(roomCode.toUpperCase())!);
    return true;
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
    if (settings.typingSpellingLeniency !== undefined) {
      const allowed: TypingSpellingLeniency[] = ['normal', 'hard', 'lenient'];
      if (allowed.includes(settings.typingSpellingLeniency)) {
        room.settings.typingSpellingLeniency = settings.typingSpellingLeniency;
      }
    }
    if (settings.showOthersGuesses !== undefined) {
      room.settings.showOthersGuesses = settings.showOthersGuesses;
    }
    if (settings.questionSet === 'song' || settings.questionSet === 'trivia') {
      room.settings.questionSet = settings.questionSet;
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
      (p) => this.playerTrackCount(p) >= MIN_PLAYLIST_TRACKS,
    );
    if (!hasPlaylist) return false;
    // ...there must be at least one competing player online...
    const competitors = this.competingPlayerEntries(room)
      .map(([, p]) => p)
      .filter((p) => p.sockets.size > 0);
    if (competitors.length < 1) return false;
    // ...and every one of them is ready (the host presenter is exempt, and
    // offline players don't hold everyone else up).
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
      if (this.playerTrackCount(p) >= MIN_PLAYLIST_TRACKS) {
        allTracks.push(...this.playerAllTracks(p));
      }
    }

    // Flip to "playing" and broadcast immediately so every client navigates
    // into the game right away. Previews are resolved lazily per-round by the
    // engine (with caching), so we no longer block the start on a slow,
    // sequential pre-pass over every track.
    room.skippedTracksCount = 0;
    room.phase = 'playing';
    room.catchUp = [];

    // The presenter (host in host mode) contributes tracks but does not compete,
    // so they're excluded from the engine's player set entirely.
    const competing = this.competingPlayerEntries(room);
    const playerIds = competing.map(([id]) => id);
    // Everyone's names, the presenter's too: the reveal says who added each
    // song, and the presenter can add songs without competing.
    const displayNames = new Map(
      [...room.players.entries()].map(([id, p]) => [id, p.displayName]),
    );

    const engine = new GameEngine(
      allTracks,
      room.settings.gameMode,
      room.settings.roundCount,
      room.settings.roundDurationSeconds * 1000,
      playerIds,
      room.settings.typingSpellingLeniency ?? DEFAULT_TYPING_SPELLING_LENIENCY,
      room.settings.showOthersGuesses ?? false,
      {
        onRoundStart: (payload) => {
          this.broadcastGameEvent(room, 'round:start', payload);
        },
        onRoundProgress: (payload) => {
          this.broadcastGameEvent(room, 'round:progress', payload);
        },
        onRoundReveal: (payload) => {
          for (const [id, pts] of Object.entries(payload.roundScores)) {
            const pl = room.players.get(id);
            if (pl) pl.score += pts;
          }

          this.broadcastGameEvent(room, 'round:reveal', {
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
        onGameEnd: (leaderboard, reason) => {
          room.phase = 'finished';
          room.engine?.destroy();
          room.engine = null;
          const payload: GameEndPayload = {
            leaderboard: this.competingPlayerEntries(room)
              .map(([playerId, p]) => ({
                playerId,
                displayName: p.displayName,
                score: p.score,
              }))
              .sort((a, b) => b.score - a.score),
            winnerId: leaderboard[0]?.playerId ?? null,
            reason,
            roundsPlayed: engine.roundsPlayed,
            totalRounds: room.settings.roundCount,
          };
          this.broadcastGameEvent(room, 'game:end', payload);
        },
      },
      { questionSet: room.settings.questionSet },
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

  /**
   * What a player who joins now has missed: the current round and its latest
   * progress, the current reveal, or the final scores.
   */
  getCatchUpEvents(roomCode: string): GameEvent[] {
    return [...(this.rooms.get(roomCode.toUpperCase())?.catchUp ?? [])];
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

  private getPlayer(roomCode: string, playerId: string): RoomPlayer | undefined {
    return this.rooms.get(roomCode.toUpperCase())?.players.get(playerId);
  }

  private playerTrackCount(player: RoomPlayer): number {
    return player.playlists.reduce((sum, pl) => sum + pl.tracks.length, 0);
  }

  private playerAllTracks(player: RoomPlayer): NormalizedTrack[] {
    return player.playlists.flatMap((pl) => pl.tracks);
  }

  private newPlayer(id: string, displayName: string, isHost: boolean): RoomPlayer {
    return {
      id,
      displayName,
      isHost,
      isReady: false,
      playlists: [],
      score: 0,
      sockets: new Set(),
      awayTimer: null,
    };
  }

  private startAwayTimer(room: Room, playerId: string): void {
    const player = room.players.get(playerId);
    if (!player) return;
    this.clearAwayTimer(player);
    player.awayTimer = setTimeout(() => {
      player.awayTimer = null;
      if (player.sockets.size > 0 || room.players.get(playerId) !== player) return;
      // Mid-game they keep their place and score so they can come back.
      if (room.phase === 'playing') {
        this.startAwayTimer(room, playerId);
        return;
      }
      this.leaveRoom(room.code, playerId);
    }, AWAY_PLAYER_REMOVAL_MS);
  }

  private clearAwayTimer(player: RoomPlayer): void {
    if (player.awayTimer) clearTimeout(player.awayTimer);
    player.awayTimer = null;
  }

  private toLobbyState(room: Room): LobbyState {
    const players: Player[] = [...room.players.values()].map((p) => ({
      id: p.id,
      displayName: p.displayName,
      isHost: p.id === room.hostPlayerId,
      isReady: p.isReady,
      connected: p.sockets.size > 0,
      playlists: p.playlists.map((pl) => ({
        id: pl.id,
        name: pl.name,
        trackCount: pl.tracks.length,
        thumbnailUrl: pl.thumbnailUrl,
      })),
      trackCount: this.playerTrackCount(p),
      score: p.score,
    }));

    return {
      roomCode: room.code,
      phase: room.phase,
      hostPlayerId: room.hostPlayerId,
      settings: {
        ...room.settings,
        typingSpellingLeniency:
          room.settings.typingSpellingLeniency ?? DEFAULT_TYPING_SPELLING_LENIENCY,
        showOthersGuesses: room.settings.showOthersGuesses ?? false,
      },
      players,
      canStart: this.canStart(room),
      skippedTracksCount: room.skippedTracksCount,
      startCountdownEndsAt: room.startCountdownEndsAt,
    };
  }

  private broadcastGameEvent(room: Room, event: string, payload: unknown): void {
    // Progress only makes sense on top of its round:start; anything else
    // replaces what came before.
    room.catchUp =
      event === 'round:progress'
        ? [...room.catchUp.filter((e) => e.event === 'round:start'), { event, payload }]
        : [{ event, payload }];
    this.broadcast(room.code, event, payload);
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

/** Names match ignoring case and extra spaces, so "sam" and "Sam " clash. */
function sameName(a: string, b: string): boolean {
  const key = (name: string) => name.trim().replace(/\s+/g, ' ').toLocaleLowerCase();
  return key(a) === key(b);
}
