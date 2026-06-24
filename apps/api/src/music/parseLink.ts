import { parseSpotifyLink } from '../spotify/client.js';

export type MusicProvider = 'spotify' | 'apple' | 'youtube';

export type MusicLinkKind = 'playlist' | 'album';

export interface ParsedMusicLink {
  provider: MusicProvider;
  kind: MusicLinkKind;
  id: string;
  /** Apple Music storefront code, e.g. `us`. */
  storefront?: string;
}

const APPLE_PATH =
  /music\.apple\.com\/(?:[a-z]{2}\/)?(?<kind>playlist|album)\/[^/?#]+\/(?<id>[^/?#]+)/i;

const YOUTUBE_LIST = /(?:music\.youtube\.com|youtube\.com|youtu\.be)[^?#]*(?:\?[^#]*?|&)(?:list=)(?<id>[a-zA-Z0-9_-]+)/i;

export function parseMusicLink(input: string): ParsedMusicLink | null {
  const trimmed = input.trim();

  const spotify = parseSpotifyLink(trimmed);
  if (spotify) {
    return { provider: 'spotify', kind: spotify.kind, id: spotify.id };
  }

  const apple = trimmed.match(APPLE_PATH);
  if (apple?.groups) {
    const kind = apple.groups.kind.toLowerCase() as MusicLinkKind;
    const id = apple.groups.id;
    const storefront = trimmed.match(/music\.apple\.com\/([a-z]{2})\//i)?.[1]?.toLowerCase();
    if (kind === 'album' && !/^\d+$/.test(id)) return null;
    if (kind === 'playlist' && !id.startsWith('pl.')) return null;
    return { provider: 'apple', kind, id, storefront: storefront ?? 'us' };
  }

  const youtube = trimmed.match(YOUTUBE_LIST);
  if (youtube?.groups?.id) {
    return { provider: 'youtube', kind: 'playlist', id: youtube.groups.id };
  }

  return null;
}

export function playlistSourceKey(parsed: ParsedMusicLink, source: string): string {
  if (parsed.provider === 'spotify' && parsed.kind === 'album') {
    return `album:${parsed.id}`;
  }
  return source.slice(0, 64);
}
