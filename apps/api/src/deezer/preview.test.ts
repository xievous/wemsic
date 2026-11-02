import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const fetchMock = vi.fn();

function deezer(results: Array<{ artist: string; title: string; preview?: string }>) {
  return {
    ok: true,
    json: async () => ({
      data: results.map((r) => ({ artist: { name: r.artist }, title: r.title, preview: r.preview ?? '' })),
    }),
  };
}

// The module caches lookups, so each test gets a fresh copy.
async function load() {
  vi.resetModules();
  return (await import('./preview.js')).resolvePreviewUrl;
}

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

describe('resolvePreviewUrl', () => {
  it('searches without the broken artist:/track: filters', async () => {
    fetchMock.mockResolvedValue(deezer([]));
    const resolve = await load();
    await resolve('Daft Punk', 'Get Lucky (Radio Edit)');

    const query = decodeURIComponent(new URL(fetchMock.mock.calls[0]![0]).searchParams.get('q')!);
    expect(query).toBe('Daft Punk Get Lucky');
  });

  it('skips tribute acts and other songs, picking the matching track', async () => {
    fetchMock.mockResolvedValue(
      deezer([
        { artist: 'Get Lucky', title: 'Get Lucky - Tribute to Daft Punk', preview: 'tribute' },
        { artist: 'Daft Punk', title: 'One More Time', preview: 'other-song' },
        { artist: 'Daft Punk', title: 'Get Lucky (feat. Pharrell Williams)', preview: 'right' },
      ]),
    );
    const resolve = await load();
    expect(await resolve('Daft Punk', 'Get Lucky')).toBe('right');
  });

  it('matches accents, case and split duo names', async () => {
    fetchMock.mockResolvedValue(
      deezer([{ artist: 'Simon & Garfunkel', title: 'The Boxer', preview: 'boxer' }]),
    );
    const resolve = await load();
    expect(await resolve('simon', 'THE BOXER')).toBe('boxer');
  });

  it('returns null when nothing matches, and remembers that', async () => {
    fetchMock.mockResolvedValue(deezer([{ artist: 'Someone Else', title: 'Song', preview: 'x' }]));
    const resolve = await load();
    expect(await resolve('Artist', 'Song')).toBeNull();
    expect(await resolve('Artist', 'Song')).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('retries after HTTP errors, network errors and quota errors instead of caching them', async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: false, json: async () => ({}) })
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({ ok: true, json: async () => ({ error: { code: 4, message: 'Quota limit exceeded' } }) })
      .mockResolvedValueOnce(deezer([{ artist: 'Artist', title: 'Song', preview: 'ok' }]));
    const resolve = await load();

    expect(await resolve('Artist', 'Song')).toBeNull();
    expect(await resolve('Artist', 'Song')).toBeNull();
    expect(await resolve('Artist', 'Song')).toBeNull();
    expect(await resolve('Artist', 'Song')).toBe('ok');
  });
});
