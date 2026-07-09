import type { CatalogSearchResult } from '@wemsic/shared';
import { PRESET_MIN_TRACKS } from '@wemsic/shared';
import { searchAppleMusicPlaylists } from '../apple/search.js';
import { matchPresets } from './presets.js';
import { searchSpotifyPlaylists } from '../spotify/search.js';
import { searchYouTubeMusicPlaylists } from '../youtube/scraper.js';

const SEARCH_MAX_COMBINED = 24;

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

function spotifyPlaylistId(url: string): string | null {
  return url.match(/playlist\/([a-zA-Z0-9]+)/)?.[1] ?? null;
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

function dedupeCombinedResults(results: CatalogSearchResult[]): CatalogSearchResult[] {
  const seen = new Set<string>();
  const deduped: CatalogSearchResult[] = [];
  for (const result of results) {
    const key = `${result.source}:${result.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(result);
    if (deduped.length >= SEARCH_MAX_COMBINED) break;
  }
  return deduped;
}

export async function searchCatalog(query: string): Promise<CatalogSearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const presetMatches = matchPresets(trimmed).map(presetToResult);
  const presetIds = new Set(presetMatches.map((p) => p.id));
  const presetSpotifyIds = new Set(
    presetMatches
      .map((p) => (p.url ? spotifyPlaylistId(p.url) : null))
      .filter((id): id is string => !!id),
  );

  const [ytmResult, spotifyResult, appleResult] = await Promise.allSettled([
    searchYouTubeMusicPlaylists(trimmed),
    searchSpotifyPlaylists(trimmed),
    searchAppleMusicPlaylists(trimmed),
  ]);

  let ytmHits: CatalogSearchResult[] = [];
  if (ytmResult.status === 'fulfilled') {
    ytmHits = ytmResult.value
      .filter((hit) => !presetIds.has(hit.id))
      .map((hit) => ({
        id: `ytm:${hit.id}`,
        name: hit.name,
        description: hit.author ? `By ${hit.author}` : undefined,
        url: hit.url,
        ytmBrowseId: hit.browseId,
        trackCount: hit.trackCount,
        source: 'youtube' as const,
        thumbnailUrl: hit.thumbnailUrl,
      }));
  }

  let spotifyHits: CatalogSearchResult[] = [];
  if (spotifyResult.status === 'fulfilled') {
    spotifyHits = spotifyResult.value
      .filter((hit) => !presetSpotifyIds.has(hit.id))
      .map((hit) => ({
        id: `spotify:${hit.id}`,
        name: hit.name,
        description: hit.owner ? `By ${hit.owner}` : undefined,
        url: hit.url,
        trackCount: hit.trackCount,
        source: 'spotify' as const,
        thumbnailUrl: hit.thumbnailUrl,
      }));
  }

  let appleHits: CatalogSearchResult[] = [];
  if (appleResult.status === 'fulfilled') {
    appleHits = appleResult.value.map((hit) => ({
      id: `apple:${hit.id}`,
      name: hit.name,
      description: hit.curator ? `By ${hit.curator}` : undefined,
      url: hit.url,
      trackCount: hit.trackCount,
      source: 'apple' as const,
      thumbnailUrl: hit.thumbnailUrl,
    }));
  }

  return rankResults(
    dedupeCombinedResults([...presetMatches, ...spotifyHits, ...appleHits, ...ytmHits]),
  );
}
