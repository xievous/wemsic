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

/** Hard mode — case and accents only; spaces and punctuation must match. */
export function normalizeHard(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim();
}

/** Lenient mode — letters and digits only, no spaces or punctuation. */
export function normalizeLenient(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, '')
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

/** Remove a matched phrase from a guess to isolate the other field. */
export function removeNormalizedPhrase(text: string, phrase: string): string {
  const normalized = normalizeAnswer(text);
  const needle = normalizeAnswer(phrase);
  if (!needle || needle.length < 2 || !normalized.includes(needle)) {
    return normalized;
  }
  return normalized.replace(needle, ' ').replace(/\s+/g, ' ').trim();
}

/** Hard mode — exact spelling, spacing, and punctuation. */
export function hardPhraseMatchesTarget(target: string, guess: string): boolean {
  const nt = normalizeHard(target);
  const ng = normalizeHard(guess);
  if (!nt || !ng) return false;
  return ng.includes(nt);
}

export function hardTitleMatchesGuess(fullTitle: string, guess: string): boolean {
  const trimmed = guess.trim();
  if (!trimmed) return false;
  if (isQualifierOnlyGuess(trimmed)) return false;

  const coreTitle = stripTitleQualifiers(fullTitle);
  const nc = normalizeHard(coreTitle);
  const ng = normalizeHard(trimmed);
  if (!nc || !ng) return false;

  return ng.includes(nc) || nc === ng;
}

function lenientSimilarMatch(
  expected: string,
  actual: string,
  minRatio = 0.65,
  minLengthRatio = 0.55,
): boolean {
  const a = normalizeLenient(expected);
  const b = normalizeLenient(actual);
  if (!a || !b) return false;
  if (a === b) return true;

  const minLen = Math.min(a.length, b.length);
  const maxLen = Math.max(a.length, b.length);
  if (minLen < 3) return false;
  if (minLen / maxLen < minLengthRatio) return false;

  return levenshteinRatio(a, b) >= minRatio;
}

/** Lenient mode — typos and missing spaces are OK. */
export function lenientPhraseMatchesTarget(target: string, guess: string): boolean {
  const nt = normalizeLenient(target);
  const ng = normalizeLenient(guess);
  if (!nt || !ng) return false;
  if (nt === ng) return true;
  if (ng.includes(nt)) return true;
  if (nt.startsWith(ng) && ng.length >= 3) return true;
  return lenientSimilarMatch(nt, ng);
}

export function lenientTitleMatchesGuess(fullTitle: string, guess: string): boolean {
  const trimmed = guess.trim();
  if (!trimmed) return false;
  if (isQualifierOnlyGuess(trimmed)) return false;

  const coreTitle = stripTitleQualifiers(fullTitle);
  const nc = normalizeLenient(coreTitle);
  const ng = normalizeLenient(trimmed);
  if (!nc || !ng) return false;
  if (ng.includes(nc)) return true;
  return lenientSimilarMatch(nc, ng);
}

/** Both artist + title typed as one mashed-together guess (lenient only). */
export function lenientCombinedMatchesGuess(
  artists: string[],
  fullTitle: string,
  guess: string,
): boolean {
  const ng = normalizeLenient(guess);
  if (!ng) return false;

  const titleCore = normalizeLenient(stripTitleQualifiers(fullTitle));
  if (!titleCore) return false;

  for (const artist of artists) {
    const na = normalizeLenient(artist);
    if (!na) continue;

    for (const combo of [na + titleCore, titleCore + na]) {
      if (lenientSimilarMatch(combo, ng)) return true;
    }
  }

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
