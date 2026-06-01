import {
  ALL_ANSWERED_REVEAL_DELAY_MS,
  MCQ_OPTION_COUNT,
  MIN_ROUND_REMAINING_MS,
  TIMER_SHRINK_PER_SUBMISSION_RATIO,
  applyTypingTimeBonus,
  evaluateTypingGuess,
  scoreSpeedChoice,
} from '@wemsic/shared';
import type {
  GameMode,
  McqOption,
  NormalizedTrack,
  RoundPlayerStatus,
  RoundProgressPayload,
  RoundRevealPayload,
  RoundStartPayload,
} from '@wemsic/shared';
import { nanoid } from 'nanoid';
import { resolvePreviewUrl } from '../deezer/preview.js';
import { TrackPool } from './TrackPool.js';

interface PlayerAnswer {
  answer: unknown;
  submittedAt: number;
  points?: number;
}

interface ActiveRound {
  track: NormalizedTrack;
  previewUrl: string;
  correctOptionId: string;
  options: McqOption[];
  roundStartedAt: number;
  roundEndsAt: number;
  answers: Map<string, PlayerAnswer>;
  /** Typing: locked when guess is correct */
  donePlayerIds: Set<string>;
}

export class GameEngine {
  private pool: TrackPool;
  private roundIndex = 0;
  private activeRound: ActiveRound | null = null;
  private scores = new Map<string, number>();
  private roundTimer: ReturnType<typeof setTimeout> | null = null;
  private revealPending = false;
  private lastTypingGuessAt = new Map<string, number>();

  private onRoundStart: (payload: RoundStartPayload) => void;
  private onRoundProgress: (payload: RoundProgressPayload) => void;
  private onRoundReveal: (payload: RoundRevealPayload) => void;
  private onGameEnd: (leaderboard: RoundRevealPayload['leaderboard']) => void;

  constructor(
    tracks: NormalizedTrack[],
    private gameMode: GameMode,
    private totalRounds: number,
    private roundDurationMs: number,
    private playerIds: string[],
    callbacks: {
      onRoundStart: (payload: RoundStartPayload) => void;
      onRoundProgress: (payload: RoundProgressPayload) => void;
      onRoundReveal: (payload: RoundRevealPayload) => void;
      onGameEnd: (leaderboard: RoundRevealPayload['leaderboard']) => void;
    },
  ) {
    this.pool = new TrackPool(tracks);
    for (const id of playerIds) this.scores.set(id, 0);
    this.onRoundStart = callbacks.onRoundStart;
    this.onRoundProgress = callbacks.onRoundProgress;
    this.onRoundReveal = callbacks.onRoundReveal;
    this.onGameEnd = callbacks.onGameEnd;
  }

  async start(): Promise<void> {
    await this.nextRound();
  }

  submitMcqAnswer(playerId: string, optionId: string): boolean {
    if (!this.activeRound || this.gameMode !== 'speed_choice') return false;
    if (Date.now() > this.activeRound.roundEndsAt) return false;
    if (this.activeRound.donePlayerIds.has(playerId)) return false;

    this.activeRound.donePlayerIds.add(playerId);
    this.activeRound.answers.set(playerId, {
      answer: { optionId },
      submittedAt: Date.now(),
    });

    this.onSubmission(playerId);
    return true;
  }

  submitTypingGuess(playerId: string, guess: string): { correct: boolean } {
    if (!this.activeRound || this.gameMode !== 'typing') return { correct: false };
    if (Date.now() > this.activeRound.roundEndsAt) return { correct: false };
    if (this.activeRound.donePlayerIds.has(playerId)) return { correct: true };

    const now = Date.now();
    const last = this.lastTypingGuessAt.get(playerId) ?? 0;
    if (now - last < 120) return { correct: false };
    this.lastTypingGuessAt.set(playerId, now);

    const round = this.activeRound;
    const result = evaluateTypingGuess(
      round.track.artists,
      round.track.title,
      guess,
    );

    if (result.points <= 0) return { correct: false };

    const timeRemaining = Math.max(0, round.roundEndsAt - now);
    const points = applyTypingTimeBonus(
      result.points,
      timeRemaining,
      this.roundDurationMs,
    );

    round.donePlayerIds.add(playerId);
    round.answers.set(playerId, {
      answer: { guess: guess.trim() },
      submittedAt: now,
      points,
    });

    this.onSubmission(playerId);
    return { correct: true };
  }

  destroy(): void {
    if (this.roundTimer) clearTimeout(this.roundTimer);
  }

  setDisplayNames(names: Map<string, string>): void {
    this.displayNames = names;
  }

  private displayNames = new Map<string, string>();

  getLeaderboardWithNames() {
    return [...this.scores.entries()]
      .map(([playerId, score]) => ({
        playerId,
        displayName: this.displayNames.get(playerId) ?? 'Player',
        score,
      }))
      .sort((a, b) => b.score - a.score);
  }

  private onSubmission(_playerId: string): void {
    this.accelerateTimer();
    this.emitProgress();
    this.checkAllAnswered();
  }

  private accelerateTimer(): void {
    const round = this.activeRound;
    if (!round) return;

    const n = this.playerIds.length;
    const k = round.donePlayerIds.size;
    if (n === 0 || k === 0) return;

    const remaining = round.roundEndsAt - Date.now();
    if (remaining <= MIN_ROUND_REMAINING_MS) return;

    const shrink =
      1 - (k / n) * TIMER_SHRINK_PER_SUBMISSION_RATIO;
    round.roundEndsAt = Date.now() + Math.max(
      MIN_ROUND_REMAINING_MS,
      remaining * shrink,
    );
    this.scheduleReveal();
  }

  private checkAllAnswered(): void {
    const round = this.activeRound;
    if (!round || this.revealPending) return;
    if (round.donePlayerIds.size < this.playerIds.length) return;

    this.revealPending = true;
    if (this.roundTimer) {
      clearTimeout(this.roundTimer);
      this.roundTimer = null;
    }
    setTimeout(() => {
      this.revealPending = false;
      void this.revealRound();
    }, ALL_ANSWERED_REVEAL_DELAY_MS);
  }

  private scheduleReveal(): void {
    if (this.roundTimer) clearTimeout(this.roundTimer);
    const round = this.activeRound;
    if (!round) return;
    const delay = Math.max(0, round.roundEndsAt - Date.now());
    this.roundTimer = setTimeout(() => void this.revealRound(), delay);
  }

  private buildPlayerStatuses(): RoundPlayerStatus[] {
    const done = this.activeRound?.donePlayerIds ?? new Set();
    return this.playerIds.map((playerId) => ({
      playerId,
      displayName: this.displayNames.get(playerId) ?? 'Player',
      done: done.has(playerId),
    }));
  }

  private emitProgress(): void {
    const round = this.activeRound;
    if (!round) return;
    const payload: RoundProgressPayload = {
      roundIndex: this.roundIndex,
      roundEndsAt: round.roundEndsAt,
      roundDurationMs: this.roundDurationMs,
      players: this.buildPlayerStatuses(),
    };
    this.onRoundProgress(payload);
  }

  private async nextRound(): Promise<void> {
    if (this.roundIndex >= this.totalRounds) {
      this.endGame();
      return;
    }

    this.lastTypingGuessAt.clear();
    this.revealPending = false;

    let track: NormalizedTrack | null = null;
    let previewUrl: string | null = null;
    let attempts = 0;

    while (attempts < 30) {
      track = this.pool.pickNext();
      if (!track) break;
      previewUrl = await resolvePreviewUrl(track.artists[0] ?? '', track.title);
      if (previewUrl) break;
      attempts++;
    }

    if (!track || !previewUrl) {
      this.endGame();
      return;
    }

    const roundStartedAt = Date.now();
    const roundEndsAt = roundStartedAt + this.roundDurationMs;
    const mcq =
      this.gameMode === 'speed_choice'
        ? this.buildMcqOptions(track)
        : { options: [] as McqOption[], correctOptionId: '' };

    this.activeRound = {
      track,
      previewUrl,
      correctOptionId: mcq.correctOptionId,
      options: mcq.options,
      roundStartedAt,
      roundEndsAt,
      answers: new Map(),
      donePlayerIds: new Set(),
    };

    const payload: RoundStartPayload = {
      roundIndex: this.roundIndex,
      totalRounds: this.totalRounds,
      gameMode: this.gameMode,
      previewUrl,
      roundEndsAt,
      roundDurationMs: this.roundDurationMs,
      players: this.buildPlayerStatuses(),
      options: this.gameMode === 'speed_choice' ? mcq.options : undefined,
    };

    this.onRoundStart(payload);
    this.emitProgress();
    this.scheduleReveal();
  }

  private buildMcqOptions(correct: NormalizedTrack): {
    options: McqOption[];
    correctOptionId: string;
  } {
    const all = this.pool.getAllTracks().filter(
      (t) => t.spotifyTrackId !== correct.spotifyTrackId,
    );
    shuffle(all);
    const distractors = all.slice(0, MCQ_OPTION_COUNT - 1);
    const correctId = nanoid(8);
    const options: McqOption[] = [
      { id: correctId, label: correct.title },
      ...distractors.map((t) => ({ id: nanoid(8), label: t.title })),
    ];
    shuffle(options);
    const correctOpt = options.find((o) => o.label === correct.title);
    return {
      options,
      correctOptionId: correctOpt?.id ?? correctId,
    };
  }

  private async revealRound(): Promise<void> {
    if (!this.activeRound) return;
    const round = this.activeRound;
    this.activeRound = null;
    this.revealPending = false;
    if (this.roundTimer) {
      clearTimeout(this.roundTimer);
      this.roundTimer = null;
    }

    const roundScores: Record<string, number> = {};

    for (const playerId of this.playerIds) {
      const entry = round.answers.get(playerId);
      let points = 0;

      if (entry) {
        if (this.gameMode === 'speed_choice') {
          const optionId = (entry.answer as { optionId?: string })?.optionId;
          const correct = optionId === round.correctOptionId;
          const timeRemaining = Math.max(0, round.roundEndsAt - entry.submittedAt);
          points = scoreSpeedChoice(
            correct,
            timeRemaining,
            this.roundDurationMs,
          );
        } else if (entry.points !== undefined) {
          points = entry.points;
        }
      }

      roundScores[playerId] = points;
      this.scores.set(playerId, (this.scores.get(playerId) ?? 0) + points);
    }

    const payload: RoundRevealPayload = {
      roundIndex: this.roundIndex,
      correctTitle: round.track.title,
      correctArtists: round.track.artists,
      albumArtUrl: round.track.albumArtUrl,
      roundScores,
      leaderboard: this.getLeaderboardWithNames(),
    };

    this.onRoundReveal(payload);
    this.roundIndex++;

    setTimeout(() => void this.nextRound(), 4000);
  }

  private endGame(): void {
    this.onGameEnd(this.getLeaderboardWithNames());
  }
}

function shuffle<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
}
