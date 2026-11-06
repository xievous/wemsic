import { normalizeAnswer, stripTitleQualifiers } from '@wemsic/shared';

const previewCache = new Map<string, string | null>();

export interface DeezerTrack {
  id?: number;
  preview?: string;
  title?: string;
  artist?: { id?: number; name?: string };
}

export async function resolvePreviewUrl(
  artist: string,
  title: string,
): Promise<string | null> {
  const key = `${artist}::${title}`.toLowerCase();
  if (previewCache.has(key)) {
    return previewCache.get(key) ?? null;
  }

  // Deezer's `artist:"…" track:"…"` filter returns no results, so search
  // plainly and check the artist and title ourselves.
  const coreTitle = stripTitleQualifiers(title);
  const query = encodeURIComponent(`${artist} ${coreTitle}`);
  const url = `https://api.deezer.com/search?q=${query}&limit=10`;

  try {
    const res = await fetch(url);
    // Network and quota errors (Deezer sends quota errors as HTTP 200 with an
    // `error` body) are temporary, so they're not cached.
    if (!res.ok) return null;
    const data = (await res.json()) as { data?: DeezerTrack[]; error?: unknown };
    if (data.error) return null;

    const preview = pickPreview(data.data ?? [], artist, coreTitle);
    previewCache.set(key, preview);
    return preview;
  } catch {
    return null;
  }
}

/** First result by the same artist whose title matches, so we never play the wrong song. */
function pickPreview(results: DeezerTrack[], artist: string, coreTitle: string): string | null {
  return findSong(results.filter((t) => t.preview), artist, coreTitle)?.preview ?? null;
}

/** The first result that is this song by this artist, not a cover or a different song. */
export function findSong<T extends DeezerTrack>(
  results: T[],
  artist: string,
  coreTitle: string,
): T | undefined {
  const wantArtist = normalizeAnswer(artist);
  const wantTitle = normalizeAnswer(coreTitle);
  if (!wantArtist || !wantTitle) return undefined;

  return results.find((t) => {
    const gotTitle = normalizeAnswer(stripTitleQualifiers(t.title ?? ''));
    return gotTitle === wantTitle && sameArtist(normalizeAnswer(t.artist?.name ?? ''), wantArtist);
  });
}

/**
 * Importers split "Simon & Garfunkel" into "Simon" and "Garfunkel", so a
 * leading-name match counts too.
 */
function sameArtist(a: string, b: string): boolean {
  return a === b || a.startsWith(`${b} `) || b.startsWith(`${a} `);
}
