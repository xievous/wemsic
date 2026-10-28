const previewCache = new Map<string, string | null>();

export async function resolvePreviewUrl(
  artist: string,
  title: string,
): Promise<string | null> {
  const key = `${artist}::${title}`.toLowerCase();
  if (previewCache.has(key)) {
    return previewCache.get(key) ?? null;
  }

  const query = encodeURIComponent(`artist:"${artist}" track:"${title}"`);
  const url = `https://api.deezer.com/search?q=${query}&limit=5`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      previewCache.set(key, null);
      return null;
    }
    const data = (await res.json()) as {
      data?: Array<{ preview?: string; title?: string; artist?: { name?: string } }>;
    };

    const match =
      data.data?.find((t) => t.preview) ??
      data.data?.find(
        (t) =>
          t.title?.toLowerCase().includes(title.toLowerCase().slice(0, 8)) &&
          t.preview,
      );

    const preview = match?.preview ?? null;
    previewCache.set(key, preview);
    return preview;
  } catch {
    previewCache.set(key, null);
    return null;
  }
}
