import {
  MCQ_OPTION_COUNT,
  scoreSpeedChoice,
  scoreTypingBase,
  applyTypingTimeBonus,
} from '@wemsic/shared';
import type {
  GameMode,
  McqOption,
  NormalizedTrack,
  RoundRevealPayload,
  RoundStartPayload,
} from '@wemsic/shared';
import { nanoid } from 'nanoid';
import { resolvePreviewUrl } from '../deezer/preview.js';
import { TrackPool } from './TrackPool.js';

interface ActiveRound {
  track: NormalizedTrack;
  previewUrl: string;
  correctOptionId: string;
  options: McqOption[];
  roundEndsAt: number;
  answers: Map<string, { answer: unknown; submittedAt: number }>;
}

export class GameEngine {
  private pool: TrackPool;
  private roundIndex = 0;
  private activeRound: ActiveRound | null = null;
  private scores = new Map<string, number>();
  private roundTimer: ReturnType<typeof setTimeout> | null = null;
  private onRoundStart: (payload: RoundStartPayload) => void;
  private onRoundReveal: (payload: RoundRevealPayload) => void;
  private onGameEnd: (leaderboard: RoundRevealPayload['leaderboard']) => void;

  constructor(
    tracks: NormalizedTrack[],
    private gameMode: GameMode,
    private totalRounds: number,
    private roundDurationMs: number,
    playerIds: string[],
    callbacks: {
      onRoundStart: (payload: RoundStartPayload) => void;
      onRoundReveal: (payload: RoundRevealPayload) => void;
      onGameEnd: (leaderboard: RoundRevealPayload['leaderboard']) => void;
    },
  ) {
    this.pool = new TrackPool(tracks);
    for (const id of playerIds) this.scores.set(id, 0);
    this.onRoundStart = callbacks.onRoundStart;
    this.onRoundReveal = callbacks.onRoundReveal;
    this.onGameEnd = callbacks.onGameEnd;
  }

  async start(): Promise<void> {
    await this.nextRound();
  }

  submitAnswer(playerId: string, answer: unknown): boolean {
    if (!this.activeRound) return false;
    if (Date.now() > this.activeRound.roundEndsAt) return false;
    if (this.activeRound.answers.has(playerId)) return false;
    this.activeRound.answers.set(playerId, {
      answer,
      submittedAt: Date.now(),
    });
    return true;
  }

  destroy(): void {
    if (this.roundTimer) clearTimeout(this.roundTimer);
  }

  private async nextRound(): Promise<void> {
    if (this.roundIndex >= this.totalRounds) {
      this.endGame();
      return;
    }

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

    const roundEndsAt = Date.now() + this.roundDurationMs;
    const mcq =
      this.gameMode === 'speed_choice'
        ? this.buildMcqOptions(track)
        : { options: [] as McqOption[], correctOptionId: '' };

    this.activeRound = {
      track,
      previewUrl,
      correctOptionId: mcq.correctOptionId,
      options: mcq.options,
      roundEndsAt,
      answers: new Map(),
    };

    const payload: RoundStartPayload = {
      roundIndex: this.roundIndex,
      totalRounds: this.totalRounds,
      gameMode: this.gameMode,
      previewUrl,
      roundEndsAt,
      roundDurationMs: this.roundDurationMs,
      options: this.gameMode === 'speed_choice' ? mcq.options : undefined,
    };

    this.onRoundStart(payload);

    this.roundTimer = setTimeout(() => {
      void this.revealRound();
    }, this.roundDurationMs);
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
    if (this.roundTimer) {
      clearTimeout(this.roundTimer);
      this.roundTimer = null;
    }

    const roundScores: Record<string, number> = {};

    for (const [playerId, { answer, submittedAt }] of round.answers) {
      const timeRemaining = Math.max(0, round.roundEndsAt - submittedAt);
      let points = 0;

      if (this.gameMode === 'speed_choice') {
        const optionId = (answer as { optionId?: string })?.optionId;
        const correct = optionId === round.correctOptionId;
        points = scoreSpeedChoice(correct, timeRemaining, this.roundDurationMs);
      } else {
        const typed = answer as { artist?: string; title?: string };
        const result = scoreTypingBase(
          round.track.artists,
          round.track.title,
          typed.artist ?? '',
          typed.title ?? '',
        );
        points = applyTypingTimeBonus(
          result.points,
          timeRemaining,
          this.roundDurationMs,
        );
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
      leaderboard: this.getLeaderboard(),
    };

    this.onRoundReveal(payload);
    this.roundIndex++;

    setTimeout(() => void this.nextRound(), 4000);
  }

  private getLeaderboard() {
    return [...this.scores.entries()]
      .map(([playerId, score]) => ({ playerId, displayName: playerId, score }))
      .sort((a, b) => b.score - a.score);
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
