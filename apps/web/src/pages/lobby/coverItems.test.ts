import { describe, expect, it } from 'vitest';
import type { CatalogSearchResult, PlayerPlaylist } from '@wemsic/shared';
import { carouselItems, importedPlaylistId, looksLikeLink } from './coverItems';

function result(overrides: Partial<CatalogSearchResult> = {}): CatalogSearchResult {
  return {
    id: 'x',
    name: 'All Out 80s',
    url: 'https://open.spotify.com/playlist/37i9dQZF1DX4UtSsGT1Sbe',
    trackCount: 150,
    source: 'preset',
    ...overrides,
  };
}

function mine(id: string): PlayerPlaylist {
  return { id, name: 'x', trackCount: 10, thumbnailUrl: null };
}

describe('importedPlaylistId', () => {
  it('matches the id the server gives an import from that link', () => {
    const long = `https://music.apple.com/us/playlist/${'a'.repeat(80)}`;
    expect(importedPlaylistId(result({ url: long }))).toBe(long.slice(0, 64));
  });

  it('falls back to the YouTube browse URL when there is no link', () => {
    expect(importedPlaylistId(result({ url: undefined, ytmBrowseId: 'VLPL123' }))).toBe(
      'https://music.youtube.com/browse/VLPL123',
    );
    expect(importedPlaylistId(result({ url: undefined }))).toBeNull();
  });
});

describe('carouselItems', () => {
  it('leaves out playlists this player already added', () => {
    const a = result();
    const b = result({ name: 'Rock', url: 'https://open.spotify.com/playlist/rock' });
    const items = carouselItems([a, b], [mine(a.url!)], { showSource: false });
    expect(items.map((i) => i.name)).toEqual(['Rock']);
  });

  it('shows the source only for search results, and drops duplicates', () => {
    const r = result({ source: 'spotify', trackCount: 1 });
    const items = carouselItems([r, r], [], { showSource: true });
    expect(items).toHaveLength(1);
    expect(items[0]!.meta).toBe('Spotify · 1 song');
    expect(carouselItems([result()], [], { showSource: false })[0]!.meta).toBe('150 songs');
  });
});

describe('looksLikeLink', () => {
  it('tells a pasted link from words', () => {
    expect(looksLikeLink('https://open.spotify.com/playlist/abc')).toBe(true);
    expect(looksLikeLink('open.spotify.com/playlist/abc')).toBe(true);
    expect(looksLikeLink('eurovision')).toBe(false);
    expect(looksLikeLink('90s rock')).toBe(false);
  });
});
