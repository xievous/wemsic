/**
 * Helpers for the lobby's number settings. The field keeps what the host types
 * as a draft, so a half-typed value like "1" (on the way to "15") isn't sent
 * and clamped by the server on every keystroke.
 */

/** The draft as a setting if it's already a whole number in range, else null. */
export function validSetting(draft: string, min: number, max: number): number | null {
  if (!/^\d+$/.test(draft.trim())) return null;
  const n = Number(draft);
  return n >= min && n <= max ? n : null;
}

/** What a finished draft becomes: rounded and clamped into range, or null if it isn't a number. */
export function settleSetting(draft: string, min: number, max: number): number | null {
  const trimmed = draft.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n)) return null;
  return Math.min(max, Math.max(min, Math.round(n)));
}
