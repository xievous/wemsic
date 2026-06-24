import type { NormalizedTrack } from '@wemsic/shared';
import {
  ScrapeError,
  type ScrapeProgressCallback,
} from '../spotify/scraper.js';
import { USER_AGENT } from '../music/userAgent.js';

const YTM_BROWSE = 'https://music.youtube.com/youtubei/v1/browse?prettyPrint=false';
const YTM_SEARCH = 'https://music.youtube.com/youtubei/v1/search?prettyPrint=false';

/** Filter search to playlists only. */
const YTM_PARAMS_PLAYLISTS = 'EgIQAw%3D%3D';

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
        navigationEndpoint?: {
          watchEndpoint?: { videoId?: string };
          browseEndpoint?: { browseId?: string };
        };
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
    navigationEndpoint?: {
      watchEndpoint?: { videoId?: string };
      browseEndpoint?: { browseId?: string };
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

async function ytmSearchPost(body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const res = await fetch(YTM_SEARCH, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': USER_AGENT,
      Origin: 'https://music.youtube.com',
    },
    body: JSON.stringify({ context: { client: YTM_CLIENT }, ...body }),
  });

  if (!res.ok) {
    throw new ScrapeError(`YouTube Music search failed (${res.status}). Try again in a moment.`);
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

function findPlaylistHeader(data: Record<string, unknown>): {
  title?: { runs?: YtmTextRun[] };
  subtitle?: { runs?: YtmTextRun[] };
  secondSubtitle?: { runs?: YtmTextRun[] };
  description?: { runs?: YtmTextRun[] };
} | null {
  const contents = data.contents as Record<string, unknown> | undefined;
  const twoColumn = contents?.twoColumnBrowseResultsRenderer as
    | Record<string, unknown>
    | undefined;
  const tabs = twoColumn?.tabs as Array<Record<string, unknown>> | undefined;
  const tabContent = tabs?.[0]?.tabRenderer as Record<string, unknown> | undefined;
  const sectionList = tabContent?.content as Record<string, unknown> | undefined;
  const sections = sectionList?.sectionListRenderer as Record<string, unknown> | undefined;
  const headerSection = (sections?.contents as Array<Record<string, unknown>> | undefined)?.[0];
  return (
    (headerSection?.musicResponsiveHeaderRenderer as
      | {
          title?: { runs?: YtmTextRun[] };
          subtitle?: { runs?: YtmTextRun[] };
          secondSubtitle?: { runs?: YtmTextRun[] };
          description?: { runs?: YtmTextRun[] };
        }
      | undefined) ?? null
  );
}

function findPlaylistTitle(data: Record<string, unknown>): string | null {
  const header = findPlaylistHeader(data);
  return textFromRuns(header?.title?.runs) || null;
}

function findPlaylistTrackCount(data: Record<string, unknown>): number | null {
  const header = findPlaylistHeader(data);
  if (!header) return null;

  const texts = [
    textFromRuns(header.secondSubtitle?.runs),
    textFromRuns(header.subtitle?.runs),
    textFromRuns(header.description?.runs),
  ];

  for (const text of texts) {
    const count = parseTrackCountFromSubtitle(text);
    if (count != null) return count;
  }

  return null;
}

function videoIdFromRenderer(
  renderer: NonNullable<YtmListItem['musicResponsiveListItemRenderer']>,
): string | null {
  const fromOverlay =
    renderer.overlay?.musicItemThumbnailOverlayRenderer?.content?.musicPlayButtonRenderer
      ?.playNavigationEndpoint?.watchEndpoint?.videoId;
  if (fromOverlay) return fromOverlay;

  const fromRoot = renderer.navigationEndpoint?.watchEndpoint?.videoId;
  if (fromRoot) return fromRoot;

  for (const column of renderer.flexColumns ?? []) {
    const id =
      column.musicResponsiveListItemFlexColumnRenderer?.navigationEndpoint?.watchEndpoint
        ?.videoId;
    if (id) return id;
  }

  return null;
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
  const videoId = videoIdFromRenderer(renderer);

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

function findSearchContinuation(data: Record<string, unknown>): string | null {
  const contents = data.contents as
    | { tabbedSearchResultsRenderer?: { tabs?: Array<Record<string, unknown>> } }
    | undefined;
  const tab = contents?.tabbedSearchResultsRenderer?.tabs?.[0]?.tabRenderer as
    | Record<string, unknown>
    | undefined;
  const sectionList = tab?.content as Record<string, unknown> | undefined;
  const sections = (sectionList?.sectionListRenderer as Record<string, unknown> | undefined)
    ?.contents as Array<Record<string, unknown>> | undefined;

  for (const section of sections ?? []) {
    const shelf = section.musicShelfRenderer as { contents?: YtmListItem[] } | undefined;
    if (shelf?.contents) {
      const token = continuationToken(shelf.contents);
      if (token) return token;
    }
  }

  const contItems = collectContinuationItems(data);
  return continuationToken(contItems);
}

function collectContinuationItems(node: unknown): YtmListItem[] {
  const out: YtmListItem[] = [];
  if (!node || typeof node !== 'object') return out;
  if (Array.isArray(node)) {
    for (const item of node) out.push(...collectContinuationItems(item));
    return out;
  }
  const obj = node as Record<string, unknown>;
  if (obj.continuationItemRenderer) {
    out.push(obj as YtmListItem);
  }
  for (const value of Object.values(obj)) {
    out.push(...collectContinuationItems(value));
  }
  return out;
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

export interface YtmPlaylistSearchHit {
  id: string;
  name: string;
  author?: string;
  trackCount?: number;
  thumbnailUrl?: string;
  url: string;
}

function parseTrackCountFromSubtitle(subtitle: string): number | undefined {
  const match = subtitle.match(/(\d[\d,]*)\s+songs?/i);
  if (!match?.[1]) return undefined;
  return Number.parseInt(match[1].replace(/,/g, ''), 10);
}

function parseAuthorFromSubtitle(subtitle: string): string | undefined {
  const parts = subtitle.split('•').map((part) => part.trim());
  const authorPart = parts.find(
    (part) => part && !/\d[\d,]*\s+songs?/i.test(part) && !/^playlist$/i.test(part),
  );
  return authorPart || undefined;
}

function hitFromBrowseId(
  browseId: string,
  title: string,
  subtitle: string,
  thumbnailUrl?: string,
): YtmPlaylistSearchHit | null {
  if (!browseId.startsWith('VL') || !title) return null;
  const playlistId = browseId.slice(2);
  return {
    id: playlistId,
    name: title,
    author: parseAuthorFromSubtitle(subtitle),
    trackCount: parseTrackCountFromSubtitle(subtitle),
    thumbnailUrl,
    url: `https://music.youtube.com/playlist?list=${playlistId}`,
  };
}

function parsePlaylistFromTwoRow(
  renderer: Record<string, unknown>,
): YtmPlaylistSearchHit | null {
  const title = textFromRuns(
    (renderer.title as { runs?: YtmTextRun[] } | undefined)?.runs,
  );
  const subtitle = textFromRuns(
    (renderer.subtitle as { runs?: YtmTextRun[] } | undefined)?.runs,
  );
  const nav = renderer.navigationEndpoint as
    | { browseEndpoint?: { browseId?: string } }
    | undefined;
  const browseId = nav?.browseEndpoint?.browseId;
  if (!browseId) return null;

  const thumbRenderer = renderer.thumbnailRenderer as
    | {
        musicThumbnailRenderer?: {
          thumbnail?: { thumbnails?: Array<{ url?: string; width?: number }> };
        };
      }
    | undefined;

  return hitFromBrowseId(
    browseId,
    title,
    subtitle,
    bestThumbnail(thumbRenderer?.musicThumbnailRenderer?.thumbnail?.thumbnails) ?? undefined,
  );
}

function parsePlaylistFromListItem(item: YtmListItem): YtmPlaylistSearchHit | null {
  const renderer = item.musicResponsiveListItemRenderer;
  if (!renderer) return null;

  const columns = renderer.flexColumns ?? [];
  const title = textFromRuns(
    columns[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs,
  );
  const subtitle = textFromRuns(
    columns[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs,
  );
  const browseId =
    renderer.navigationEndpoint?.browseEndpoint?.browseId ??
    columns[0]?.musicResponsiveListItemFlexColumnRenderer?.navigationEndpoint?.browseEndpoint
      ?.browseId;
  if (!browseId) return null;

  return hitFromBrowseId(
    browseId,
    title,
    subtitle,
    bestThumbnail(
      renderer.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails,
    ) ?? undefined,
  );
}

function collectPlaylistHits(node: unknown, out: YtmPlaylistSearchHit[]): void {
  if (!node || typeof node !== 'object') return;

  if (Array.isArray(node)) {
    for (const item of node) collectPlaylistHits(item, out);
    return;
  }

  const obj = node as Record<string, unknown>;
  const twoRow = obj.musicTwoRowItemRenderer;
  if (twoRow && typeof twoRow === 'object') {
    const hit = parsePlaylistFromTwoRow(twoRow as Record<string, unknown>);
    if (hit) out.push(hit);
  }

  if (obj.musicResponsiveListItemRenderer) {
    const hit = parsePlaylistFromListItem(obj as YtmListItem);
    if (hit) out.push(hit);
  }

  for (const value of Object.values(obj)) {
    collectPlaylistHits(value, out);
  }
}

function dedupePlaylistHits(hits: YtmPlaylistSearchHit[]): YtmPlaylistSearchHit[] {
  const seen = new Set<string>();
  const result: YtmPlaylistSearchHit[] = [];
  for (const hit of hits) {
    if (seen.has(hit.id)) continue;
    seen.add(hit.id);
    result.push(hit);
  }
  return result;
}

const SEARCH_MAX_RESULTS = 20;
const SEARCH_MAX_PAGES = 3;
const ENRICH_BATCH_SIZE = 4;

async function searchPlaylistsForQuery(query: string): Promise<YtmPlaylistSearchHit[]> {
  const hits: YtmPlaylistSearchHit[] = [];
  let continuation: string | null = null;
  let pages = 0;

  while (hits.length < SEARCH_MAX_RESULTS && pages < SEARCH_MAX_PAGES) {
    let data: Record<string, unknown>;
    try {
      data = continuation
        ? await ytmSearchPost({ continuation })
        : await ytmSearchPost({ query, params: YTM_PARAMS_PLAYLISTS });
    } catch {
      break;
    }

    collectPlaylistHits(data, hits);

    const contItems = collectContinuationItems(data);
    continuation = continuationToken(contItems) ?? findSearchContinuation(data);
    pages++;
    if (!continuation) break;
    await delay(80);
  }

  return dedupePlaylistHits(hits);
}

export async function fetchYouTubeMusicPlaylistMeta(
  playlistId: string,
): Promise<{ name: string | null; trackCount: number | null }> {
  try {
    const data = await ytmPost({ browseId: `VL${playlistId}` });
    return {
      name: findPlaylistTitle(data),
      trackCount: findPlaylistTrackCount(data),
    };
  } catch {
    return { name: null, trackCount: null };
  }
}

export async function enrichPlaylistTrackCounts(
  hits: YtmPlaylistSearchHit[],
): Promise<YtmPlaylistSearchHit[]> {
  const enriched: YtmPlaylistSearchHit[] = [];

  for (let i = 0; i < hits.length; i += ENRICH_BATCH_SIZE) {
    const batch = hits.slice(i, i + ENRICH_BATCH_SIZE);
    const results = await Promise.all(
      batch.map(async (hit) => {
        if (hit.trackCount != null) return hit;
        const meta = await fetchYouTubeMusicPlaylistMeta(hit.id);
        return {
          ...hit,
          name: meta.name ?? hit.name,
          trackCount: meta.trackCount ?? undefined,
        };
      }),
    );
    enriched.push(...results);
    if (i + ENRICH_BATCH_SIZE < hits.length) await delay(60);
  }

  return enriched;
}

export async function searchYouTubeMusicPlaylists(
  theme: string,
): Promise<YtmPlaylistSearchHit[]> {
  const trimmed = theme.trim();
  if (!trimmed) return [];

  const queries = [`${trimmed} playlist`, trimmed];
  const all: YtmPlaylistSearchHit[] = [];

  for (const query of queries) {
    const hits = await searchPlaylistsForQuery(query);
    all.push(...hits);
    if (dedupePlaylistHits(all).length >= SEARCH_MAX_RESULTS) break;
    await delay(80);
  }

  const deduped = dedupePlaylistHits(all).slice(0, SEARCH_MAX_RESULTS);
  if (deduped.length === 0) return [];

  return enrichPlaylistTrackCounts(deduped);
}
