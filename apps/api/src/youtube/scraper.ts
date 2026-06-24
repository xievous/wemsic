import type { NormalizedTrack } from '@wemsic/shared';
import {
  ScrapeError,
  type ScrapeProgressCallback,
} from '../spotify/scraper.js';
import { USER_AGENT } from '../music/userAgent.js';

const YTM_BROWSE = 'https://music.youtube.com/youtubei/v1/browse?prettyPrint=false';

const YTM_CLIENT = {
  clientName: 'WEB_REMIX',
  clientVersion: '1.20250219.01.00',
  hl: 'en',
  gl: 'US',
};

interface YtmTextRun {
  text?: string;
}

interface YtmListItem {
  musicResponsiveListItemRenderer?: {
    flexColumns?: Array<{
      musicResponsiveListItemFlexColumnRenderer?: {
        text?: { runs?: YtmTextRun[] };
      };
    }>;
    fixedColumns?: Array<{
      musicResponsiveListItemFixedColumnRenderer?: {
        text?: { runs?: YtmTextRun[] };
      };
    }>;
    thumbnail?: {
      musicThumbnailRenderer?: {
        thumbnail?: { thumbnails?: Array<{ url?: string; width?: number }> };
      };
    };
    overlay?: {
      musicItemThumbnailOverlayRenderer?: {
        content?: {
          musicPlayButtonRenderer?: {
            playNavigationEndpoint?: {
              watchEndpoint?: { videoId?: string };
            };
          };
        };
      };
    };
  };
  continuationItemRenderer?: {
    continuationEndpoint?: {
      continuationCommand?: { token?: string };
    };
  };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function textFromRuns(runs: YtmTextRun[] | undefined): string {
  return (runs ?? []).map((run) => run.text ?? '').join('').trim();
}

function parseDurationMs(text: string): number {
  const parts = text.split(':').map((part) => Number.parseInt(part, 10));
  if (parts.some((part) => Number.isNaN(part))) return 0;
  if (parts.length === 3) {
    return ((parts[0]! * 60 + parts[1]!) * 60 + parts[2]!) * 1000;
  }
  if (parts.length === 2) {
    return (parts[0]! * 60 + parts[1]!) * 1000;
  }
  return 0;
}

function artistsFromLabel(label: string): string[] {
  if (!label.trim()) return ['Unknown artist'];
  return label
    .split(/\s*(?:,|&|\band\b)\s*/i)
    .map((name) => name.trim())
    .filter(Boolean);
}

function bestThumbnail(
  thumbnails: Array<{ url?: string; width?: number }> | undefined,
): string | null {
  if (!thumbnails?.length) return null;
  return [...thumbnails].sort((a, b) => (b.width ?? 0) - (a.width ?? 0))[0]?.url ?? null;
}

async function ytmPost(body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const res = await fetch(YTM_BROWSE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': USER_AGENT,
      Origin: 'https://music.youtube.com',
    },
    body: JSON.stringify({ context: { client: YTM_CLIENT }, ...body }),
  });

  if (!res.ok) {
    throw new ScrapeError(`YouTube Music request failed (${res.status}). Try again in a moment.`);
  }

  return res.json() as Promise<Record<string, unknown>>;
}

function findPlaylistShelf(data: Record<string, unknown>): {
  contents: YtmListItem[];
} | null {
  const contents = data.contents as Record<string, unknown> | undefined;
  const twoColumn = contents?.twoColumnBrowseResultsRenderer as
    | Record<string, unknown>
    | undefined;
  const secondary = twoColumn?.secondaryContents as Record<string, unknown> | undefined;
  const sectionList = secondary?.sectionListRenderer as Record<string, unknown> | undefined;
  const sections = sectionList?.contents as Array<Record<string, unknown>> | undefined;
  const shelf = sections?.[0]?.musicPlaylistShelfRenderer as
    | { contents?: YtmListItem[] }
    | undefined;
  return shelf?.contents ? { contents: shelf.contents } : null;
}

function findPlaylistTitle(data: Record<string, unknown>): string | null {
  const contents = data.contents as Record<string, unknown> | undefined;
  const twoColumn = contents?.twoColumnBrowseResultsRenderer as
    | Record<string, unknown>
    | undefined;
  const tabs = twoColumn?.tabs as Array<Record<string, unknown>> | undefined;
  const tabContent = tabs?.[0]?.tabRenderer as Record<string, unknown> | undefined;
  const sectionList = tabContent?.content as Record<string, unknown> | undefined;
  const sections = sectionList?.sectionListRenderer as Record<string, unknown> | undefined;
  const headerSection = (sections?.contents as Array<Record<string, unknown>> | undefined)?.[0];
  const header = headerSection?.musicResponsiveHeaderRenderer as
    | { title?: { runs?: YtmTextRun[] } }
    | undefined;
  return textFromRuns(header?.title?.runs) || null;
}

function parseTrackItem(item: YtmListItem, playerId: string): NormalizedTrack | null {
  const renderer = item.musicResponsiveListItemRenderer;
  if (!renderer) return null;

  const columns = renderer.flexColumns ?? [];
  const title = textFromRuns(
    columns[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs,
  );
  const artistLabel = textFromRuns(
    columns[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs,
  );
  const durationLabel = textFromRuns(
    renderer.fixedColumns?.[0]?.musicResponsiveListItemFixedColumnRenderer?.text?.runs,
  );
  const videoId =
    renderer.overlay?.musicItemThumbnailOverlayRenderer?.content?.musicPlayButtonRenderer
      ?.playNavigationEndpoint?.watchEndpoint?.videoId;

  if (!title || !videoId) return null;

  return {
    spotifyTrackId: `ytm:${videoId}`,
    title,
    artists: artistsFromLabel(artistLabel),
    albumArtUrl: bestThumbnail(
      renderer.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails,
    ),
    durationMs: parseDurationMs(durationLabel),
    contributedBy: playerId,
    previewUrl: null,
  };
}

function continuationToken(items: YtmListItem[]): string | null {
  const last = items.at(-1);
  return (
    last?.continuationItemRenderer?.continuationEndpoint?.continuationCommand?.token ?? null
  );
}

function parseContinuationItems(data: Record<string, unknown>): YtmListItem[] {
  const actions = data.onResponseReceivedActions as Array<Record<string, unknown>> | undefined;
  const append = actions?.[0]?.appendContinuationItemsAction as
    | { continuationItems?: YtmListItem[] }
    | undefined;
  return append?.continuationItems ?? [];
}

function shuffleTracks<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
}

export async function scrapeYouTubeMusicFromLink(
  playlistId: string,
  playerId: string,
  onProgress?: ScrapeProgressCallback,
): Promise<{ tracks: NormalizedTrack[]; sourceName: string; truncated?: boolean }> {
  onProgress?.({
    phase: 'opening',
    loaded: 0,
    total: null,
    label: 'Opening YouTube Music…',
  });

  let data: Record<string, unknown>;
  try {
    data = await ytmPost({ browseId: `VL${playlistId}` });
  } catch {
    throw new ScrapeError(
      'Could not open that YouTube Music playlist. Check that the link is public.',
    );
  }

  const sourceName = findPlaylistTitle(data) ?? 'YouTube Music import';
  const shelf = findPlaylistShelf(data);
  if (!shelf) {
    throw new ScrapeError(
      'Could not read tracks from that YouTube Music playlist. Check that the link is public.',
    );
  }

  const tracks: NormalizedTrack[] = [];
  const seen = new Set<string>();
  let items = shelf.contents;
  let continuation = continuationToken(items);

  while (true) {
    for (const item of items) {
      if (item.continuationItemRenderer) continue;
      const track = parseTrackItem(item, playerId);
      if (!track || seen.has(track.spotifyTrackId)) continue;
      seen.add(track.spotifyTrackId);
      tracks.push(track);
    }

    onProgress?.({
      phase: 'loading',
      loaded: tracks.length,
      total: continuation ? null : tracks.length,
      label: 'Loading tracks…',
    });

    if (!continuation) break;

    await delay(100);
    const nextPage = await ytmPost({ continuation });
    items = parseContinuationItems(nextPage);
    continuation = continuationToken(items);
    if (items.length === 0) break;
  }

  if (tracks.length === 0) {
    throw new ScrapeError('No importable tracks found in that YouTube Music playlist.');
  }

  onProgress?.({
    phase: 'finishing',
    loaded: tracks.length,
    total: tracks.length,
    label: 'Finishing up…',
  });

  shuffleTracks(tracks);
  return { tracks, sourceName };
}
