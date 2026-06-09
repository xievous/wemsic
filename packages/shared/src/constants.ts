export const MIN_PLAYLIST_TRACKS = 10;
export const MAX_TRACKS_PER_PLAYER = 50;
export const DEFAULT_ROUND_COUNT = 10;
export const DEFAULT_SPEED_CHOICE_SECONDS = 15;
export const DEFAULT_TYPING_SECONDS = 30;
export const ROOM_CODE_LENGTH = 6;
export const MAX_PLAYERS = 8;

export const SPEED_CHOICE_MAX_POINTS = 1000;
export const SPEED_CHOICE_MIN_POINTS = 100;

export const TYPING_ARTIST_POINTS = 400;
export const TYPING_TITLE_POINTS = 400;
export const TYPING_BOTH_POINTS = 1000;

export const MCQ_OPTION_COUNT = 4;

/** MCQ: timer shrink when any player submits */
export const TIMER_SHRINK_PER_SUBMISSION_RATIO = 0.65;
/** Typing: timer shrink when a player gets both artist + title */
export const TYPING_BOTH_TIMER_SHRINK_RATIO = 0.3;
export const MIN_ROUND_REMAINING_MS = 2000;
/** Minimum time a preview plays before early round end (ms) */
export const MIN_ROUND_PLAY_MS = 10000;
export const MIN_ROUND_PLAY_FRACTION = 0.45;
export const ALL_ANSWERED_REVEAL_DELAY_MS = 600;
export const BETWEEN_ROUNDS_DELAY_MS = 4500;
