import type { NormalizedTrack } from '@wemsic/shared';
import { scrapeAppleMusicFromLink } from '../apple/scraper.js';
import { parseMusicLink } from './parseLink.js';
import {
  ScrapeError,
  scrapeSpotifyFromLink,
  type ScrapeProgressCallback,
} from '../spotify/scraper.js';
import { scrapeYouTubeMusicFromLink } from '../youtube/scraper.js';

export { ScrapeError, type ScrapeProgress, type ScrapeProgressCallback } from '../spotify/scraper.js';
export { parseMusicLink, playlistSourceKey } from './parseLink.js';

export async function scrapeMusicFromLink(
  input: string,
  playerId: string,
  onProgress?: ScrapeProgressCallback,
): Promise<{ tracks: NormalizedTrack[]; sourceName: string; truncated?: boolean }> {
  const parsed = parseMusicLink(input);
  if (!parsed) {
    throw new ScrapeError(
      'Invalid link. Paste a public Spotify, Apple Music, or YouTube Music playlist or album URL.',
    );
  }

  switch (parsed.provider) {
    case 'spotify':
      return scrapeSpotifyFromLink(input, playerId, onProgress);
    case 'apple':
      return scrapeAppleMusicFromLink(
        parsed.storefront ?? 'us',
        parsed.kind,
        parsed.id,
        playerId,
        onProgress,
      );
    case 'youtube':
      return scrapeYouTubeMusicFromLink(parsed.id, playerId, onProgress);
  }
}
