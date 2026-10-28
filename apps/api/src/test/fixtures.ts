import type { NormalizedTrack } from '@wemsic/shared';

/** Preview URL that encodes the title, so a test can tell which track a round is playing. */
export function previewFor(title: string): string {
  return `https://preview.test/${encodeURIComponent(title)}`;
}

export function titleFromPreview(previewUrl: string): string {
  return decodeURIComponent(previewUrl.slice('https://preview.test/'.length));
}

export function makeTrack(
  id: string,
  contributedBy: string,
  overrides: Partial<NormalizedTrack> = {},
): NormalizedTrack {
  const title = overrides.title ?? `Song ${id}`;
  return {
    spotifyTrackId: id,
    title,
    artists: [`Artist ${id}`],
    albumArtUrl: null,
    durationMs: 180_000,
    contributedBy,
    previewUrl: previewFor(title),
    ...overrides,
  };
}

/** `count` tracks for one contributor, ids prefixed so contributors never collide. */
export function makeTracks(contributedBy: string, count: number): NormalizedTrack[] {
  return Array.from({ length: count }, (_, i) => makeTrack(`${contributedBy}-${i + 1}`, contributedBy));
}
