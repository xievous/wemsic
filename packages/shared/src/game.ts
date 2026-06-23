export type GameMode = 'speed_choice' | 'typing';

/** How strictly typed answers are matched in typing mode. */
export type TypingSpellingLeniency = 'normal' | 'hard' | 'lenient';

/**
 * How a room is played.
 * - `online`: every player answers on their own device and hears the preview there.
 * - `host`: a shared-screen party mode. The host device is a presenter (sound +
 *   big question visuals) and does not compete; players answer on their phones
 *   without audio.
 */
export type RoomType = 'online' | 'host';

export type RoomPhase = 'lobby' | 'playing' | 'finished';

export interface NormalizedTrack {
  spotifyTrackId: string;
  title: string;
  artists: string[];
  albumArtUrl: string | null;
  durationMs: number;
  contributedBy: string;
  previewUrl?: string | null;
}

export interface Player {
  id: string;
  displayName: string;
  isHost: boolean;
  isReady: boolean;
  spotifyConnected: boolean;
  playlistId: string | null;
  playlistName: string | null;
  trackCount: number;
  score: number;
}

export interface RoomSettings {
  gameMode: GameMode;
  roundCount: number;
  roundDurationSeconds: number;
  /** Typing mode only — how forgiving answer matching is. */
  typingSpellingLeniency: TypingSpellingLeniency;
  /** Chosen at room creation and immutable afterwards. */
  roomType: RoomType;
}

export interface LobbyState {
  roomCode: string;
  phase: RoomPhase;
  hostPlayerId: string;
  settings: RoomSettings;
  players: Player[];
  canStart: boolean;
  skippedTracksCount?: number;
  /** Unix ms when the cancellable start countdown ends; null when idle */
  startCountdownEndsAt?: number | null;
}

export interface McqOption {
  id: string;
  label: string;
}

export interface RoundPlayerStatus {
  playerId: string;
  displayName: string;
  /** Speed choice: picked an option. Typing: got artist + title */
  done: boolean;
  artistCorrect?: boolean;
  titleCorrect?: boolean;
  bothCorrect?: boolean;
}

export interface RoundProgressPayload {
  roundIndex: number;
  roundEndsAt: number;
  roundDurationMs: number;
  players: RoundPlayerStatus[];
}

export interface RoundStartPayload {
  roundIndex: number;
  totalRounds: number;
  gameMode: GameMode;
  previewUrl: string;
  roundEndsAt: number;
  roundDurationMs: number;
  players: RoundPlayerStatus[];
  options?: McqOption[];
}

export interface RoundRevealPayload {
  roundIndex: number;
  correctTitle: string;
  correctArtists: string[];
  albumArtUrl: string | null;
  roundScores: Record<string, number>;
  leaderboard: LeaderboardEntry[];
  /** Unix ms when the next round begins */
  nextRoundStartsAt: number;
  betweenRoundsDelayMs: number;
}

export interface LeaderboardEntry {
  playerId: string;
  displayName: string;
  score: number;
}

export interface GameEndPayload {
  leaderboard: LeaderboardEntry[];
  winnerId: string | null;
}

export interface SpeedChoiceAnswer {
  optionId: string;
}

export interface TypingGuessAnswer {
  guess: string;
}

export type AnswerPayload = SpeedChoiceAnswer | TypingGuessAnswer;

export interface PlaylistImportProgressPayload {
  playerId: string;
  phase: 'opening' | 'loading' | 'finishing';
  loaded: number;
  total: number | null;
  label?: string;
}
