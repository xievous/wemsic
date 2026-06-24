import type { CatalogSearchResult } from '@wemsic/shared';
import { PRESET_MIN_TRACKS } from '@wemsic/shared';
import { matchPresets } from './presets.js';
import {
  enrichPlaylistTrackCounts,
  searchYouTubeMusicPlaylists,
} from '../youtube/scraper.js';

function presetToResult(preset: ReturnType<typeof matchPresets>[number]): CatalogSearchResult {
  return {
    id: preset.id,
    name: preset.name,
    description: preset.description,
    url: preset.url,
    trackCount: preset.estimatedTracks,
    source: 'preset',
  };
}

function rankResults(results: CatalogSearchResult[]): CatalogSearchResult[] {
  return [...results].sort((a, b) => {
    const aScore =
      (a.source === 'preset' ? 1000 : 0) +
      (a.trackCount && a.trackCount >= PRESET_MIN_TRACKS ? 100 : 0) +
      (a.trackCount ?? 0);
    const bScore =
      (b.source === 'preset' ? 1000 : 0) +
      (b.trackCount && b.trackCount >= PRESET_MIN_TRACKS ? 100 : 0) +
      (b.trackCount ?? 0);
    return bScore - aScore;
  });
}

export async function searchCatalog(query: string): Promise<CatalogSearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const presetMatches = matchPresets(trimmed).map(presetToResult);
  const presetIds = new Set(presetMatches.map((p) => p.id));

  let ytmHits: CatalogSearchResult[] = [];
  try {
    const playlists = await searchYouTubeMusicPlaylists(trimmed);
    ytmHits = playlists
      .filter((hit) => !presetIds.has(hit.id))
      .map((hit) => ({
        id: `ytm:${hit.id}`,
        name: hit.name,
        description: hit.author ? `By ${hit.author}` : undefined,
        url: hit.url,
        trackCount: hit.trackCount,
        source: 'youtube' as const,
        thumbnailUrl: hit.thumbnailUrl,
      }));
  } catch {
    // YTM search is best-effort; presets still surface.
  }

  return rankResults([...presetMatches, ...ytmHits]);
}
