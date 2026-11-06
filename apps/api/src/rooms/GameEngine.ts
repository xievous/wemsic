import {
  ALL_ANSWERED_REVEAL_DELAY_MS,
  BETWEEN_ROUNDS_DELAY_MS,
  MCQ_OPTION_COUNT,
  MIN_ROUND_PLAY_FRACTION,
  MIN_ROUND_PLAY_MS,
  MIN_ROUND_REMAINING_MS,
  TIMER_SHRINK_PER_SUBMISSION_RATIO,
  TYPING_BOTH_POINTS,
  applyTypingTimeBonus,
  evaluateTypingSubmission,
  matchPlayerName,
  parseYearGuess,
  triviaTextMatches,
  scoreSpeedChoice,
  scoreTypingProgress,
} from '@wemsic/shared';
import type {
  GameEndReason,
  GameMode,
  McqOption,
  NormalizedTrack,
  QuestionSet,
  RoundPlayerStatus,
  RoundProgressPayload,
  RoundRevealPayload,
  RoundStartPayload,
  TriviaKind,
  TypingGuessResult,
  TypingSpellingLeniency,
} from '@wemsic/shared';
import { nanoid } from 'nanoid';
import { resolveTrackFacts } from '../itunes/facts.js';
import { resolvePreviewUrl } from '../deezer/preview.js';
import { TrackPool } from './TrackPool.js';
import { pickTriviaQuestion, type Contributor, type TriviaQuestion } from './trivia.js';

interface PlayerAnswer {
  answer: unknown;
  submittedAt: number;
}

interface TypingPlayerProgress {
  artistCorrect: boolean;
  titleCorrect: boolean;
  artistCorrectAt: number | null;
  titleCorrectAt: number | null;
  bothCorrectAt: number | null;
}

interface ActiveRound {
  track: NormalizedTrack;
  previewUrl: string;
  correctOptionId: string;
  options: McqOption[];
  roundStartedAt: number;
  roundEndsAt: number;
  answers: Map<string, PlayerAnswer>;
  mcqDoneIds: Set<string>;
  typingProgress: Map<string, TypingPlayerProgress>;
  /** Latest fully incorrect guess per player (visible-guesses typing mode) */
  typingVisibleGuesses: Map<string, string>;
  /** Trivia rounds: the question being asked. */
  trivia: TriviaQuestion | null;
  /** Trivia typing: each player's final answer; credit is 1 when right, 0 when not. */
  triviaAnswers: Map<string, { credit: number; at: number }>;
}

/** Trivia questions answered once (typing every year or name until one fits would be too easy). */
function isOneShot(kind: TriviaKind): boolean {
  return kind === 'year' || kind === 'added_by';
}

function emptyTypingProgress(): TypingPlayerProgress {
  return {
    artistCorrect: false,
    titleCorrect: false,
    artistCorrectAt: null,
    titleCorrectAt: null,
    bothCorrectAt: null,
  };
}

export class GameEngine {
  private pool: TrackPool;
  private roundIndex = 0;
  private activeRound: ActiveRound | null = null;
  private scores = new Map<string, number>();
  private roundTimer: ReturnType<typeof setTimeout> | null = null;
  /** Every pending timeout, so destroy() can stop the game mid-flight. */
  private timeouts = new Set<ReturnType<typeof setTimeout>>();
  private destroyed = false;
  private revealPending = false;
  private isRevealing = false;
  private lastTriviaKind: TriviaKind | null = null;
  private questionSet: QuestionSet;

  private onRoundStart: (payload: RoundStartPayload) => void;
  private onRoundProgress: (payload: RoundProgressPayload) => void;
  private onRoundReveal: (payload: RoundRevealPayload) => void;
  private onGameEnd: (leaderboard: RoundRevealPayload['leaderboard'], reason: GameEndReason) => void;

  constructor(
    tracks: NormalizedTrack[],
    private gameMode: GameMode,
    private totalRounds: number,
    private roundDurationMs: number,
    private playerIds: string[],
    private typingSpellingLeniency: TypingSpellingLeniency,
    private showOthersGuesses: boolean,
    callbacks: {
      onRoundStart: (payload: RoundStartPayload) => void;
      onRoundProgress: (payload: RoundProgressPayload) => void;
      onRoundReveal: (payload: RoundRevealPayload) => void;
      onGameEnd: (leaderboard: RoundRevealPayload['leaderboard'], reason: GameEndReason) => void;
    },
    options: { questionSet?: QuestionSet } = {},
  ) {
    this.questionSet = options.questionSet ?? 'song';
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
    if (this.activeRound.mcqDoneIds.has(playerId)) return false;

    this.activeRound.mcqDoneIds.add(playerId);
    this.activeRound.answers.set(playerId, {
      answer: { optionId },
      submittedAt: Date.now(),
    });

    this.onMcqSubmission();
    return true;
  }

  submitTypingGuess(playerId: string, guess: string): TypingGuessResult {
    const fail = (): TypingGuessResult => ({
      incorrect: true,
      matchedArtist: false,
      matchedTitle: false,
      artistCorrect: false,
      titleCorrect: false,
      bothCorrect: false,
    });

    if (!this.activeRound || this.gameMode !== 'typing') return fail();
    if (Date.now() > this.activeRound.roundEndsAt) return fail();

    const trimmed = guess.trim();
    if (!trimmed) return fail();

    const round = this.activeRound;
    if (round.trivia) return this.submitTriviaGuess(playerId, trimmed, round, round.trivia);

    const { matchedArtist, matchedTitle } = evaluateTypingSubmission(
      round.track.artists,
      round.track.title,
      trimmed,
      this.typingSpellingLeniency,
    );

    const incorrect = !matchedArtist && !matchedTitle;
    if (incorrect) {
      const prog = this.getTypingProgress(playerId);
      if (this.showOthersGuesses) {
        round.typingVisibleGuesses.set(playerId, trimmed);
      }
      this.emitProgress();
      return {
        incorrect: true,
        matchedArtist: false,
        matchedTitle: false,
        artistCorrect: prog.artistCorrect,
        titleCorrect: prog.titleCorrect,
        bothCorrect: prog.artistCorrect && prog.titleCorrect,
      };
    }

    const now = Date.now();
    const prog = this.getTypingProgress(playerId);
    const hadBoth = prog.artistCorrect && prog.titleCorrect;

    if (matchedArtist && !prog.artistCorrect) {
      prog.artistCorrect = true;
      prog.artistCorrectAt = now;
    }
    if (matchedTitle && !prog.titleCorrect) {
      prog.titleCorrect = true;
      prog.titleCorrectAt = now;
    }
    if (prog.artistCorrect && prog.titleCorrect && prog.bothCorrectAt === null) {
      prog.bothCorrectAt = now;
    }

    round.typingProgress.set(playerId, prog);

    if (this.showOthersGuesses) {
      round.typingVisibleGuesses.delete(playerId);
    }

    const bothCorrect = prog.artistCorrect && prog.titleCorrect;
    if (bothCorrect && !hadBoth) {
      this.onTypingBothCorrect();
    } else {
      this.emitProgress();
    }

    return {
      incorrect: false,
      matchedArtist,
      matchedTitle,
      artistCorrect: prog.artistCorrect,
      titleCorrect: prog.titleCorrect,
      bothCorrect,
    };
  }

  destroy(): void {
    this.destroyed = true;
    for (const id of this.timeouts) clearTimeout(id);
    this.timeouts.clear();
    this.roundTimer = null;
  }

  setDisplayNames(names: Map<string, string>): void {
    this.displayNames = names;
  }

  private displayNames = new Map<string, string>();

  /** Rounds that reached their reveal. */
  get roundsPlayed(): number {
    return this.roundIndex;
  }

  private addedBy(playerId: string): RoundRevealPayload['addedBy'] {
    const displayName = this.displayNames.get(playerId);
    return displayName ? { playerId, displayName } : null;
  }

  getLeaderboardWithNames() {
    return [...this.scores.entries()]
      .map(([playerId, score]) => ({
        playerId,
        displayName: this.displayNames.get(playerId) ?? 'Player',
        score,
      }))
      .sort((a, b) => b.score - a.score);
  }

  /**
   * A typed trivia answer. Title, artist and album take guesses until one is
   * right. A year or a player's name is final once given, and nobody learns
   * whether it was right until the reveal.
   */
  private submitTriviaGuess(
    playerId: string,
    guess: string,
    round: ActiveRound,
    question: TriviaQuestion,
  ): TypingGuessResult {
    const oneShot = isOneShot(question.kind);
    const result = (r: { incorrect: boolean; correct?: boolean; locked?: boolean; hint?: string }) => ({
      incorrect: r.incorrect,
      matchedArtist: false,
      matchedTitle: !!r.correct,
      artistCorrect: false,
      titleCorrect: !!r.correct,
      bothCorrect: !!r.correct,
      locked: r.locked,
      hint: r.hint,
    });

    if (round.triviaAnswers.has(playerId)) {
      return result({ incorrect: false, correct: !oneShot, locked: true });
    }

    let credit: number;
    if (question.kind === 'year') {
      const year = parseYearGuess(guess);
      if (year === null) return result({ incorrect: true, hint: 'Type a year, like 1997' });
      credit = year === question.year ? 1 : 0;
    } else if (question.kind === 'added_by') {
      const named = matchPlayerName(this.contributors(), guess);
      if (!named) return result({ incorrect: true, hint: "That's not someone in this game" });
      credit = named.playerId === question.addedBy!.playerId ? 1 : 0;
    } else {
      const right = triviaTextMatches(
        question.kind,
        { title: round.track.title, artists: round.track.artists, album: question.album ?? null },
        guess,
        this.typingSpellingLeniency,
      );
      if (!right) {
        if (this.showOthersGuesses) round.typingVisibleGuesses.set(playerId, guess);
        this.emitProgress();
        return result({ incorrect: true });
      }
      credit = 1;
    }

    round.triviaAnswers.set(playerId, { credit, at: Date.now() });
    round.typingVisibleGuesses.delete(playerId);
    this.emitProgress();
    this.tryEarlyEnd();
    return result({ incorrect: false, correct: !oneShot, locked: true });
  }

  /** Everyone with songs in the game, by name. */
  private contributors(): Contributor[] {
    const ids = new Set(this.pool.getAllTracks().map((t) => t.contributedBy));
    return [...ids].flatMap((playerId) => {
      const displayName = this.displayNames.get(playerId);
      return displayName ? [{ playerId, displayName }] : [];
    });
  }

  private minPlayMs(): number {
    return Math.max(
      MIN_ROUND_PLAY_MS,
      Math.floor(this.roundDurationMs * MIN_ROUND_PLAY_FRACTION),
    );
  }

  private earliestEndAt(round: ActiveRound): number {
    return round.roundStartedAt + this.minPlayMs();
  }

  private capRoundEnd(round: ActiveRound, proposedEnd: number): number {
    return Math.max(proposedEnd, this.earliestEndAt(round));
  }

  private getTypingProgress(playerId: string): TypingPlayerProgress {
    const round = this.activeRound!;
    let prog = round.typingProgress.get(playerId);
    if (!prog) {
      prog = emptyTypingProgress();
      round.typingProgress.set(playerId, prog);
    }
    return prog;
  }

  private onMcqSubmission(): void {
    this.accelerateMcqTimer();
    this.emitProgress();
    this.tryEarlyEnd();
  }

  private onTypingBothCorrect(): void {
    this.emitProgress();
    this.tryEarlyEnd();
  }

  private accelerateMcqTimer(): void {
    const round = this.activeRound;
    if (!round) return;

    const n = this.playerIds.length;
    const k = round.mcqDoneIds.size;
    if (n === 0 || k === 0) return;

    const remaining = round.roundEndsAt - Date.now();
    if (remaining <= MIN_ROUND_REMAINING_MS) return;

    const shrink = 1 - (k / n) * TIMER_SHRINK_PER_SUBMISSION_RATIO;
    const proposed =
      Date.now() + Math.max(MIN_ROUND_REMAINING_MS, remaining * shrink);
    round.roundEndsAt = this.capRoundEnd(round, proposed);
    this.scheduleReveal();
  }

  private countBothCorrect(): number {
    const round = this.activeRound;
    if (!round) return 0;
    let count = 0;
    for (const id of this.playerIds) {
      const p = round.typingProgress.get(id);
      if (p?.artistCorrect && p.titleCorrect) count++;
    }
    return count;
  }

  private allPlayersFinished(): boolean {
    const round = this.activeRound;
    if (!round) return false;
    if (this.gameMode === 'speed_choice') {
      return round.mcqDoneIds.size >= this.playerIds.length;
    }
    if (round.trivia) return round.triviaAnswers.size >= this.playerIds.length;
    return this.countBothCorrect() >= this.playerIds.length;
  }

  private tryEarlyEnd(): void {
    const round = this.activeRound;
    if (!round || this.revealPending || this.isRevealing) return;
    if (!this.allPlayersFinished()) return;
    this.triggerEarlyReveal();
  }

  private triggerEarlyReveal(): void {
    if (this.revealPending || this.isRevealing) return;
    this.revealPending = true;
    this.clearRoundTimer();
    this.schedule(() => {
      this.revealPending = false;
      void this.revealRound();
    }, ALL_ANSWERED_REVEAL_DELAY_MS);
  }

  private clearRoundTimer(): void {
    if (this.roundTimer) {
      clearTimeout(this.roundTimer);
      this.timeouts.delete(this.roundTimer);
      this.roundTimer = null;
    }
  }

  private schedule(fn: () => void, ms: number): ReturnType<typeof setTimeout> {
    const id = setTimeout(() => {
      this.timeouts.delete(id);
      if (!this.destroyed) fn();
    }, ms);
    this.timeouts.add(id);
    return id;
  }

  private clearTimers(): void {
    this.clearRoundTimer();
  }

  private scheduleReveal(): void {
    this.clearRoundTimer();
    const round = this.activeRound;
    if (!round) return;
    const delay = Math.max(0, round.roundEndsAt - Date.now());
    this.roundTimer = this.schedule(() => void this.revealRound(), delay);
  }

  private buildPlayerStatuses(): RoundPlayerStatus[] {
    const round = this.activeRound;
    return this.playerIds.map((playerId) => {
      const base = {
        playerId,
        displayName: this.displayNames.get(playerId) ?? 'Player',
      };

      if (this.gameMode === 'typing' && round?.trivia) {
        // One-shot answers show as locked in, never as right or wrong, until the reveal.
        const answer = round.triviaAnswers.get(playerId);
        const right = !!answer && !isOneShot(round.trivia.kind);
        const status: RoundPlayerStatus = { ...base, done: !!answer, bothCorrect: right };
        if (this.showOthersGuesses) {
          return { ...status, guessText: round.typingVisibleGuesses.get(playerId), guessedRight: right };
        }
        return status;
      }

      if (this.gameMode === 'typing' && round) {
        const prog = round.typingProgress.get(playerId) ?? emptyTypingProgress();
        const bothCorrect = prog.artistCorrect && prog.titleCorrect;
        const status: RoundPlayerStatus = {
          ...base,
          done: bothCorrect,
          artistCorrect: prog.artistCorrect,
          titleCorrect: prog.titleCorrect,
          bothCorrect,
        };

        if (this.showOthersGuesses) {
          const wrongGuess = round.typingVisibleGuesses.get(playerId);
          const hasCorrect = prog.artistCorrect || prog.titleCorrect;
          return {
            ...status,
            guessText: wrongGuess,
            guessedRight: hasCorrect && !wrongGuess,
          };
        }

        return status;
      }

      const done = round?.mcqDoneIds.has(playerId) ?? false;
      if (this.showOthersGuesses && done && round) {
        const entry = round.answers.get(playerId);
        const optionId = (entry?.answer as { optionId?: string })?.optionId;
        const option = round.options.find((o) => o.id === optionId);
        return { ...base, done, guessText: option?.label };
      }

      return { ...base, done };
    });
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
    if (this.destroyed) return;
    if (this.roundIndex >= this.totalRounds) {
      this.endGame('completed');
      return;
    }

    this.revealPending = false;
    this.clearTimers();

    let track: NormalizedTrack | null = null;
    let previewUrl: string | null = null;
    let attempts = 0;
    const maxAttempts = Math.max(50, this.pool.getAllTracks().length);

    while (attempts < maxAttempts) {
      track = this.pool.pickNext();
      if (!track) break;
      previewUrl = track.previewUrl ?? null;
      if (!previewUrl) {
        previewUrl = await resolvePreviewUrl(track.artists[0] ?? '', track.title);
        // The room may have moved on (rematch, everyone left) during the lookup.
        if (this.destroyed) return;
      }
      if (previewUrl) break;
      this.pool.markUnplayable(track.spotifyTrackId);
      track = null;
      attempts++;
    }

    if (!track || !previewUrl) {
      this.endGame('out_of_tracks');
      return;
    }

    const choices = this.gameMode === 'speed_choice';
    let trivia: TriviaQuestion | null = null;
    if (this.questionSet === 'trivia') {
      const song = track;
      trivia = await pickTriviaQuestion({
        track: song,
        pool: this.pool.getAllTracks(),
        contributors: this.contributors(),
        previousKind: this.lastTriviaKind,
        choices,
        facts: () => resolveTrackFacts(song.artists[0] ?? '', song.title),
      });
      if (this.destroyed) return;
      this.lastTriviaKind = trivia.kind;
    }

    const roundStartedAt = Date.now();
    const roundEndsAt = roundStartedAt + this.roundDurationMs;
    const mcq = !choices
      ? { options: [] as McqOption[], correctOptionId: '' }
      : trivia
        ? makeOptions(trivia.answer, trivia.wrong, trivia.sortOptions)
        : this.buildMcqOptions(track);

    this.activeRound = {
      track,
      previewUrl,
      correctOptionId: mcq.correctOptionId,
      options: mcq.options,
      roundStartedAt,
      roundEndsAt,
      answers: new Map(),
      mcqDoneIds: new Set(),
      typingProgress: new Map(),
      typingVisibleGuesses: new Map(),
      trivia,
      triviaAnswers: new Map(),
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
      trivia: trivia?.kind,
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
    return makeOptions(
      correct.title,
      distractors.map((t) => t.title),
    );
  }

  private async revealRound(): Promise<void> {
    if (!this.activeRound || this.isRevealing) return;
    this.isRevealing = true;
    this.revealPending = false;
    this.clearTimers();

    const round = this.activeRound;
    this.activeRound = null;

    const roundScores: Record<string, number> = {};

    for (const playerId of this.playerIds) {
      let points = 0;

      if (this.gameMode === 'speed_choice') {
        const entry = round.answers.get(playerId);
        if (entry) {
          const optionId = (entry.answer as { optionId?: string })?.optionId;
          const correct = optionId === round.correctOptionId;
          const timeRemaining = Math.max(0, round.roundEndsAt - entry.submittedAt);
          points = scoreSpeedChoice(correct, timeRemaining, this.roundDurationMs);
        }
      } else if (round.trivia) {
        const answer = round.triviaAnswers.get(playerId);
        if (answer && answer.credit > 0) {
          const timeRemaining = Math.max(0, round.roundEndsAt - answer.at);
          points = Math.floor(
            answer.credit * applyTypingTimeBonus(TYPING_BOTH_POINTS, timeRemaining, this.roundDurationMs),
          );
        }
      } else {
        const prog = round.typingProgress.get(playerId) ?? emptyTypingProgress();
        points = scoreTypingProgress(prog, round.roundEndsAt, this.roundDurationMs);
      }

      roundScores[playerId] = points;
      this.scores.set(playerId, (this.scores.get(playerId) ?? 0) + points);
    }

    const payload: RoundRevealPayload = {
      roundIndex: this.roundIndex,
      correctTitle: round.track.title,
      correctArtists: round.track.artists,
      albumArtUrl: round.track.albumArtUrl,
      addedBy: this.addedBy(round.track.contributedBy),
      trivia: round.trivia ? { kind: round.trivia.kind, answer: round.trivia.answer } : undefined,
      roundScores,
      leaderboard: this.getLeaderboardWithNames(),
      nextRoundStartsAt: Date.now() + BETWEEN_ROUNDS_DELAY_MS,
      betweenRoundsDelayMs: BETWEEN_ROUNDS_DELAY_MS,
    };

    this.onRoundReveal(payload);
    this.roundIndex++;
    this.isRevealing = false;

    this.schedule(() => void this.nextRound(), BETWEEN_ROUNDS_DELAY_MS);
  }

  private endGame(reason: GameEndReason): void {
    this.clearTimers();
    this.onGameEnd(this.getLeaderboardWithNames(), reason);
  }
}

/** Options with the correct one among them, shuffled or, for years, in order. */
function makeOptions(
  correct: string,
  wrong: string[],
  sorted = false,
): { options: McqOption[]; correctOptionId: string } {
  const correctOptionId = nanoid(8);
  const options: McqOption[] = [
    { id: correctOptionId, label: correct },
    ...wrong.map((label) => ({ id: nanoid(8), label })),
  ];
  if (sorted) options.sort((a, b) => a.label.localeCompare(b.label));
  else shuffle(options);
  return { options, correctOptionId };
}

function shuffle<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
}
