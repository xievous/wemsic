import type { PresetCatalogResponse, PresetPlaylist } from '@wemsic/shared';

/** Curated public Spotify editorial playlists (50+ tracks each). */
const PRESETS: PresetPlaylist[] = [
  {
    id: 'top-hits-global',
    name: "Today's Top Hits",
    description: 'The hottest tracks right now from around the world.',
    tags: ['trending', 'top', 'hits', 'global', 'pop', 'viral'],
    url: 'https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M',
    provider: 'spotify',
    estimatedTracks: 50,
    category: 'trending',
  },
  {
    id: 'viral-hits',
    name: 'Viral Hits',
    description: 'Songs blowing up on social media.',
    tags: ['trending', 'viral', 'hits', 'tiktok'],
    url: 'https://open.spotify.com/playlist/37i9dQZF1DX2L0iB23Enbq',
    provider: 'spotify',
    estimatedTracks: 50,
    category: 'trending',
  },
  {
    id: 'new-music-friday',
    name: 'New Music Friday',
    description: 'Fresh releases every week.',
    tags: ['trending', 'new', 'friday', 'latest'],
    url: 'https://open.spotify.com/playlist/37i9dQZF1DWXJfnUiYjUKT',
    provider: 'spotify',
    estimatedTracks: 100,
    category: 'trending',
  },
  {
    id: 'hip-hop',
    name: 'RapCaviar',
    description: 'New music from Drake, Kendrick Lamar, Cardi B and more.',
    tags: ['hip hop', 'hiphop', 'rap', 'genre'],
    url: 'https://open.spotify.com/playlist/37i9dQZF1DX0XUsuxWHRQd',
    provider: 'spotify',
    estimatedTracks: 50,
    category: 'genre',
  },
  {
    id: 'rnb',
    name: 'RNB X',
    description: 'Where R&B lives — current hits and favorites.',
    tags: ['rnb', 'r&b', 'soul', 'genre'],
    url: 'https://open.spotify.com/playlist/37i9dQZF1DX4SBhb3fqCJd',
    provider: 'spotify',
    estimatedTracks: 50,
    category: 'genre',
  },
  {
    id: 'pop',
    name: 'Pop Rising',
    description: 'Up-and-coming pop hits.',
    tags: ['pop', 'genre'],
    url: 'https://open.spotify.com/playlist/37i9dQZF1DWUa8ZRTfalHk',
    provider: 'spotify',
    estimatedTracks: 100,
    category: 'genre',
  },
  {
    id: 'rock',
    name: 'Rock Classics',
    description: 'Rock legends and anthems.',
    tags: ['rock', 'classic', 'genre'],
    url: 'https://open.spotify.com/playlist/37i9dQZF1DWXRqgorJj26U',
    provider: 'spotify',
    estimatedTracks: 200,
    category: 'genre',
  },
  {
    id: 'country',
    name: 'Hot Country',
    description: 'The hottest tracks in country music.',
    tags: ['country', 'genre'],
    url: 'https://open.spotify.com/playlist/37i9dQZF1DX1lVhptIYRda',
    provider: 'spotify',
    estimatedTracks: 50,
    category: 'genre',
  },
  {
    id: 'edm',
    name: 'Dance Hits',
    description: 'The biggest dance tracks.',
    tags: ['edm', 'dance', 'electronic', 'genre'],
    url: 'https://open.spotify.com/playlist/37i9dQZF1DX0BcQWzuB7ZO',
    provider: 'spotify',
    estimatedTracks: 50,
    category: 'genre',
  },
  {
    id: 'latin',
    name: 'Viva Latino',
    description: 'The biggest Latin songs.',
    tags: ['latin', 'reggaeton', 'spanish', 'genre'],
    url: 'https://open.spotify.com/playlist/37i9dQZF1DX10zKzsJ2jva',
    provider: 'spotify',
    estimatedTracks: 50,
    category: 'genre',
  },
  {
    id: 'disney',
    name: 'Disney Hits',
    description: 'Beloved songs from Disney movies and shows.',
    tags: ['disney', 'kids', 'family', 'theme', 'movie'],
    url: 'https://open.spotify.com/playlist/37i9dQZF1DX8C9xQcOrE6T',
    provider: 'spotify',
    estimatedTracks: 50,
    category: 'theme',
  },
  {
    id: '80s',
    name: 'All Out 80s',
    description: 'The biggest songs of the 1980s.',
    tags: ['80s', 'eighties', 'retro', 'theme', 'decade'],
    url: 'https://open.spotify.com/playlist/37i9dQZF1DX4UtSsGT1Sbe',
    provider: 'spotify',
    estimatedTracks: 150,
    category: 'theme',
  },
  {
    id: '90s',
    name: 'All Out 90s',
    description: 'The biggest songs of the 1990s.',
    tags: ['90s', 'nineties', 'retro', 'theme', 'decade'],
    url: 'https://open.spotify.com/playlist/37i9dQZF1DXbTxeAdrVG2l',
    provider: 'spotify',
    estimatedTracks: 150,
    category: 'theme',
  },
  {
    id: 'movie-soundtracks',
    name: 'Movie Hits',
    description: 'Iconic songs from the big screen.',
    tags: ['movie', 'soundtrack', 'film', 'theme'],
    url: 'https://open.spotify.com/playlist/37i9dQZF1DX5Vy6DFOcx00',
    provider: 'spotify',
    estimatedTracks: 50,
    category: 'theme',
  },
  {
    id: 'kpop',
    name: 'K-Pop ON!',
    description: 'The freshest K-pop hits.',
    tags: ['kpop', 'k-pop', 'korean', 'theme'],
    url: 'https://open.spotify.com/playlist/37i9dQZF1DX9tPFwDMOaN1',
    provider: 'spotify',
    estimatedTracks: 50,
    category: 'theme',
  },
];

export function getPresetCatalog(): PresetCatalogResponse {
  return {
    trending: PRESETS.filter((p) => p.category === 'trending'),
    genre: PRESETS.filter((p) => p.category === 'genre'),
    theme: PRESETS.filter((p) => p.category === 'theme'),
  };
}

export function getAllPresets(): PresetPlaylist[] {
  return PRESETS;
}

export function getPresetById(id: string): PresetPlaylist | undefined {
  return PRESETS.find((p) => p.id === id);
}

export function matchPresets(query: string): PresetPlaylist[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  return PRESETS.filter((preset) => {
    const haystack = [
      preset.name,
      preset.description,
      ...preset.tags,
      preset.category,
    ]
      .join(' ')
      .toLowerCase();
    return haystack.includes(q) || preset.tags.some((tag: string) => tag.includes(q) || q.includes(tag));
  });
}
