export type PresetCategory = 'trending' | 'genre' | 'theme';

export type CatalogSource = 'preset' | 'youtube';

export interface PresetPlaylist {
  id: string;
  name: string;
  description: string;
  tags: string[];
  url: string;
  provider: 'spotify' | 'youtube';
  estimatedTracks: number;
  category: PresetCategory;
}

export interface PresetCatalogResponse {
  trending: PresetPlaylist[];
  genre: PresetPlaylist[];
  theme: PresetPlaylist[];
}

export interface CatalogSearchResult {
  id: string;
  name: string;
  description?: string;
  url?: string;
  trackCount?: number;
  source: CatalogSource;
  thumbnailUrl?: string;
}
