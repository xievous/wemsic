import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearCoverCache,
  coverFromEmbedHtml,
  smallYouTubeThumbnail,
  spotifyPlaylistCover,
  spotifyPlaylistIdFromUrl,
} from './covers.js';

// A real cover id: ab67706f + 8-char size code + this 24-char hash.
const HASH = 'e06fabee7abffa117bed662f';
const fetchMock = vi.fn();

function embedPage(html: string) {
  return { ok: true, text: async () => html };
}

beforeEach(() => {
  clearCoverCache();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

describe('coverFromEmbedHtml', () => {
  it('returns the 300px variant of the playlist image', () => {
    const html = `<img src="https://image-cdn-fa.spotifycdn.com/image/ab67706f00000003${HASH}">`;
    expect(coverFromEmbedHtml(html)).toBe(`https://i.scdn.co/image/ab67706f00000002${HASH}`);
  });

  it('ignores track and artist images, which use other prefixes', () => {
    expect(coverFromEmbedHtml(`<img src="https://i.scdn.co/image/ab67616d00001e02${HASH}">`)).toBeNull();
  });
});

describe('spotifyPlaylistIdFromUrl', () => {
  it('reads playlist and embed links', () => {
    expect(spotifyPlaylistIdFromUrl('https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M?si=x')).toBe(
      '37i9dQZF1DXcBWIGoYBM5M',
    );
    expect(spotifyPlaylistIdFromUrl('https://open.spotify.com/embed/playlist/abc123')).toBe('abc123');
    expect(spotifyPlaylistIdFromUrl('https://music.apple.com/us/playlist/x/pl.1')).toBeNull();
    expect(spotifyPlaylistIdFromUrl(undefined)).toBeNull();
  });
});

describe('spotifyPlaylistCover', () => {
  it('fetches each playlist once and serves the cached cover after', async () => {
    fetchMock.mockResolvedValue(embedPage(`/image/ab67706f00000001${HASH}`));
    const first = await spotifyPlaylistCover('p1', 0);
    const second = await spotifyPlaylistCover('p1', 60_000);
    expect(first).toBe(`https://i.scdn.co/image/ab67706f00000002${HASH}`);
    expect(second).toBe(first);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('shares one request between callers asking at the same time', async () => {
    fetchMock.mockResolvedValue(embedPage(`/image/ab67706f00000001${HASH}`));
    await Promise.all([spotifyPlaylistCover('p2', 0), spotifyPlaylistCover('p2', 0)]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('refreshes a cover after a day', async () => {
    fetchMock.mockResolvedValue(embedPage(`/image/ab67706f00000001${HASH}`));
    await spotifyPlaylistCover('p3', 0);
    await spotifyPlaylistCover('p3', 25 * 60 * 60 * 1000);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('retries a failed request once straight away', async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: false, text: async () => '' })
      .mockResolvedValueOnce(embedPage(`/image/ab67706f00000001${HASH}`));
    expect(await spotifyPlaylistCover('p6', 0)).toContain(HASH);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('returns null on failure and tries again after ten minutes, not a day', async () => {
    fetchMock.mockRejectedValue(new Error('offline'));
    expect(await spotifyPlaylistCover('p4', 0)).toBeNull();
    expect(await spotifyPlaylistCover('p4', 5 * 60 * 1000)).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2); // the request and its one retry

    fetchMock.mockResolvedValue(embedPage(`/image/ab67706f00000001${HASH}`));
    expect(await spotifyPlaylistCover('p4', 11 * 60 * 1000)).toContain('ab67706f00000002');
  });

  it('keeps the old cover when a refresh fails', async () => {
    fetchMock.mockResolvedValueOnce(embedPage(`/image/ab67706f00000001${HASH}`));
    const cover = await spotifyPlaylistCover('p5', 0);
    fetchMock.mockResolvedValueOnce({ ok: false, text: async () => '' });
    expect(await spotifyPlaylistCover('p5', 25 * 60 * 60 * 1000)).toBe(cover);
  });
});

describe('smallYouTubeThumbnail', () => {
  it('asks for 300px art in both URL styles', () => {
    expect(smallYouTubeThumbnail('https://yt3.googleusercontent.com/abc=w544-h544-l90-rj')).toBe(
      'https://yt3.googleusercontent.com/abc=w300-h300-l90-rj',
    );
    expect(smallYouTubeThumbnail('https://yt3.ggpht.com/abc=s1200')).toBe('https://yt3.ggpht.com/abc=s300');
  });

  it('leaves other images alone', () => {
    const video = 'https://i.ytimg.com/vi/GibiNy4d4gc/hq720.jpg?sqp=x';
    expect(smallYouTubeThumbnail(video)).toBe(video);
    expect(smallYouTubeThumbnail(undefined)).toBeUndefined();
  });
});
