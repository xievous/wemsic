import type { CatalogSearchResult, PlayerPlaylist, PresetCatalogResponse, PresetPlaylist } from '@wemsic/shared';

/** One cover in the lobby's carousel: a curated preset or a search result. */
export interface CoverItem {
  key: string;
  name: string;
  imageUrl?: string;
  /** "Spotify · 401 songs", or just "150 songs" for presets. */
  meta: string;
  result: CatalogSearchResult;
}

const SOURCE_LABEL: Record<CatalogSearchResult['source'], string> = {
  preset: 'Curated',
  spotify: 'Spotify',
  apple: 'Apple Music',
  youtube: 'YouTube Music',
};

/**
 * The id the server gives a playlist imported from this link. It mirrors
 * playlistSourceKey in apps/api/src/music/parseLink.ts for the links the
 * catalog hands out (playlists, never Spotify albums): the link's first 64
 * characters. A YouTube result imported by browse id gets that URL instead.
 */
export function importedPlaylistId(item: CatalogSearchResult): string | null {
  const source = item.url ?? (item.ytmBrowseId ? `https://music.youtube.com/browse/${item.ytmBrowseId}` : null);
  return source ? source.slice(0, 64) : null;
}

function songs(n: number | undefined): string {
  if (n == null) return 'Length unknown';
  return `${n.toLocaleString()} song${n === 1 ? '' : 's'}`;
}

export function presetToResult(preset: PresetPlaylist): CatalogSearchResult {
  return {
    id: preset.id,
    name: preset.name,
    description: preset.description,
    url: preset.url,
    trackCount: preset.estimatedTracks,
    source: 'preset',
    thumbnailUrl: preset.coverUrl,
  };
}

/** Trending first, then the themes and genres, the way the mockup reads. */
export function presetResults(catalog: PresetCatalogResponse): CatalogSearchResult[] {
  return [...catalog.trending, ...catalog.theme, ...catalog.genre].map(presetToResult);
}

/**
 * What the carousel shows: presets, or search results while searching, minus
 * anything this player already added (that lives in Your playlists instead).
 */
export function carouselItems(
  results: CatalogSearchResult[],
  myPlaylists: PlayerPlaylist[],
  { showSource }: { showSource: boolean },
): CoverItem[] {
  const added = new Set(myPlaylists.map((p) => p.id));
  const seen = new Set<string>();
  const items: CoverItem[] = [];
  for (const result of results) {
    const id = importedPlaylistId(result);
    if (!id || added.has(id) || seen.has(id)) continue;
    seen.add(id);
    items.push({
      key: id,
      name: result.name,
      imageUrl: result.thumbnailUrl,
      meta: showSource ? `${SOURCE_LABEL[result.source]} · ${songs(result.trackCount)}` : songs(result.trackCount),
      result,
    });
  }
  return items;
}

/** A pasted link, as opposed to words to search for. */
export function looksLikeLink(text: string): boolean {
  return /^https?:\/\//i.test(text.trim()) || /(spotify\.com|music\.apple\.com|youtube\.com|youtu\.be)\//i.test(text);
}
