/** Normalize strings for answer comparison */
export function normalizeAnswer(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[''`]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function countNormalizedWords(value: string): number {
  return normalizeAnswer(value).split(' ').filter(Boolean).length;
}

/** Remove [tags], (Live), - Acoustic Version, etc. for title matching */
export function stripTitleQualifiers(title: string): string {
  let t = title.trim();
  let prev = '';
  while (t !== prev) {
    prev = t;
    t = t
      .replace(/\s*\[[^\]]*\]/gu, '')
      .replace(/\s*\([^)]*\)/gu, '')
      .replace(/\s[-–—]\s+[^-–—]+$/u, '')
      .trim();
  }
  return t;
}

/** Exact or fuzzy match — no partial single-character substring matching */
export function strictAnswerMatch(expected: string, actual: string): boolean {
  const a = normalizeAnswer(expected);
  const b = normalizeAnswer(actual);
  if (!a || !b) return false;
  if (a === b) return true;
  return levenshteinRatio(a, b) >= 0.85;
}

/**
 * Whether `guess` identifies `target` (artist names — whole guess or contains full name).
 * Target phrases must be at least 3 chars to match as substring.
 */
export function phraseMatchesTarget(target: string, guess: string): boolean {
  const nt = normalizeAnswer(target);
  const ng = normalizeAnswer(guess);
  if (!nt || !ng) return false;
  if (strictAnswerMatch(target, guess)) return true;
  if (nt.length >= 3 && ng.includes(nt)) return true;
  if (ng.length >= 3 && nt.includes(ng)) return true;
  return false;
}

const QUALIFIER_ONLY =
  /^(acoustic|live|remaster(ed)?|deluxe|edit|mix|version|radio|stripped|demo|instrumental|cover|bonus|extended|original)( (version|mix|edit|recording))?$/;

function isQualifierOnlyGuess(guess: string): boolean {
  const ng = normalizeAnswer(guess);
  return !ng || QUALIFIER_ONLY.test(ng);
}

function guessMatchesSuffixOnly(fullTitle: string, guess: string): boolean {
  const core = normalizeAnswer(stripTitleQualifiers(fullTitle));
  const ng = normalizeAnswer(guess);
  if (!ng || ng === core) return false;
  if (core.includes(ng)) return false;

  const bracketOnly = [...fullTitle.matchAll(/\[[^\]]*\]/gu)]
    .map((m) => normalizeAnswer(m[0].slice(1, -1)))
    .some((part) => part && (part === ng || (part.length >= 3 && part.includes(ng))));

  if (bracketOnly) return true;

  const nf = normalizeAnswer(fullTitle);
  return nf.includes(ng);
}

/**
 * Song title match: full core title required (not a single word from the title).
 * Strips bracket tags [like this], (Live), and "- Acoustic Version" before comparing.
 */
export function titleMatchesGuess(fullTitle: string, guess: string): boolean {
  const trimmed = guess.trim();
  if (!trimmed) return false;
  if (isQualifierOnlyGuess(trimmed)) return false;
  if (guessMatchesSuffixOnly(fullTitle, trimmed)) return false;

  const coreTitle = stripTitleQualifiers(fullTitle);
  const nc = normalizeAnswer(coreTitle);
  const ng = normalizeAnswer(trimmed);
  if (!nc || !ng) return false;

  const coreWords = countNormalizedWords(coreTitle);
  const guessWords = countNormalizedWords(trimmed);

  if (coreWords >= 2 && guessWords < 2) return false;
  if (guessWords < coreWords && nc.includes(ng)) return false;

  if (strictAnswerMatch(coreTitle, trimmed)) return true;
  if (nc.length >= 3 && ng.includes(nc)) return true;
  if (
    ng.length >= 3 &&
    guessWords >= coreWords &&
    levenshteinRatio(nc, ng) >= 0.85
  ) {
    return true;
  }

  return false;
}

/** @deprecated Prefer strictAnswerMatch / phraseMatchesTarget for typing */
export function answersMatch(expected: string, actual: string): boolean {
  return strictAnswerMatch(expected, actual);
}

function levenshteinRatio(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(a, b) / maxLen;
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    Array(n + 1).fill(0),
  );
  for (let i = 0; i <= m; i++) dp[i]![0] = i;
  for (let j = 0; j <= n; j++) dp[0]![j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i]![j] = Math.min(
        dp[i - 1]![j]! + 1,
        dp[i]![j - 1]! + 1,
        dp[i - 1]![j - 1]! + cost,
      );
    }
  }
  return dp[m]![n]!;
}
