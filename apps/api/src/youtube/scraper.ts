import type { NormalizedTrack } from '@wemsic/shared';
import { toYouTubeBrowseId } from '../music/parseLink.js';
import {
  ScrapeError,
  type ScrapeProgressCallback,
} from '../spotify/scraper.js';
import { USER_AGENT } from '../music/userAgent.js';

const YTM_BROWSE = 'https://music.youtube.com/youtubei/v1/browse?prettyPrint=false';
const YTM_SEARCH = 'https://music.youtube.com/youtubei/v1/search?prettyPrint=false';

/** Filter search to playlists only. */
const YTM_PARAMS_PLAYLISTS = 'EgIQAw%3D%3D';

const YTM_IMPORT_MAX_TRACKS = 200;
const SEARCH_MAX_RESULTS = 20;
const SEARCH_MAX_PAGES = 3;
const ENRICH_BATCH_SIZE = 4;
const COUNT_SHELF_MAX_PAGES = 4;

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
  return findShelfInNode(data);
}

function findShelfInNode(node: unknown): { contents: YtmListItem[] } | null {
  if (!node || typeof node !== 'object') return null;

  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findShelfInNode(item);
      if (found) return found;
    }
    return null;
  }

  const obj = node as Record<string, unknown>;
  const shelf = obj.musicPlaylistShelfRenderer as { contents?: YtmListItem[] } | undefined;
  if (shelf?.contents?.length) {
    return { contents: shelf.contents };
  }

  for (const value of Object.values(obj)) {
    const found = findShelfInNode(value);
    if (found) return found;
  }

  return null;
}

function findPlaylistHeader(data: Record<string, unknown>): {
  title?: { runs?: YtmTextRun[] };
  subtitle?: { runs?: YtmTextRun[] };
  secondSubtitle?: { runs?: YtmTextRun[] };
  description?: { runs?: YtmTextRun[] };
  straplineText?: { runs?: YtmTextRun[] };
} | null {
  return findHeaderInNode(data);
}

function findHeaderInNode(node: unknown): {
  title?: { runs?: YtmTextRun[] };
  subtitle?: { runs?: YtmTextRun[] };
  secondSubtitle?: { runs?: YtmTextRun[] };
  description?: { runs?: YtmTextRun[] };
  straplineText?: { runs?: YtmTextRun[] };
} | null {
  if (!node || typeof node !== 'object') return null;

  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findHeaderInNode(item);
      if (found) return found;
    }
    return null;
  }

  const obj = node as Record<string, unknown>;
  if (obj.musicResponsiveHeaderRenderer && typeof obj.musicResponsiveHeaderRenderer === 'object') {
    return obj.musicResponsiveHeaderRenderer as {
      title?: { runs?: YtmTextRun[] };
      subtitle?: { runs?: YtmTextRun[] };
      secondSubtitle?: { runs?: YtmTextRun[] };
      description?: { runs?: YtmTextRun[] };
      straplineText?: { runs?: YtmTextRun[] };
    };
  }

  for (const value of Object.values(obj)) {
    const found = findHeaderInNode(value);
    if (found) return found;
  }

  return null;
}

function findPlaylistTitle(data: Record<string, unknown>): string | null {
  const header = findPlaylistHeader(data);
  return textFromRuns(header?.title?.runs) || null;
}

function parseTrackCountFromText(text: string): number | undefined {
  if (!text.trim()) return undefined;
  const patterns = [
    /(\d[\d,]*)\s+songs?/i,
    /(\d[\d,]*)\s+tracks?/i,
    /(\d[\d,]*)\s+videos?/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return Number.parseInt(match[1].replace(/,/g, ''), 10);
  }
  return undefined;
}

function parseTrackCountFromSubtitle(subtitle: string): number | undefined {
  return parseTrackCountFromText(subtitle);
}

function findPlaylistTrackCountInTree(node: unknown, depth = 0): number | null {
  if (depth > 12 || node == null) return null;

  if (typeof node === 'string') {
    const count = parseTrackCountFromText(node);
    return count ?? null;
  }

  if (Array.isArray(node)) {
    for (const item of node) {
      const count = findPlaylistTrackCountInTree(item, depth + 1);
      if (count != null) return count;
    }
    return null;
  }

  if (typeof node === 'object') {
    const obj = node as Record<string, unknown>;
    if (obj.runs) {
      const count = parseTrackCountFromText(textFromRuns(obj.runs as YtmTextRun[]));
      if (count != null) return count;
    }
    if (typeof obj.text === 'string') {
      const count = parseTrackCountFromText(obj.text);
      if (count != null) return count;
    }
    for (const value of Object.values(obj)) {
      const count = findPlaylistTrackCountInTree(value, depth + 1);
      if (count != null) return count;
    }
  }

  return null;
}

function findPlaylistTrackCount(data: Record<string, unknown>): number | null {
  const header = findPlaylistHeader(data);
  if (header) {
    const texts = [
      textFromRuns(header.secondSubtitle?.runs),
      textFromRuns(header.subtitle?.runs),
      textFromRuns(header.description?.runs),
      textFromRuns(header.straplineText?.runs),
    ];
    for (const text of texts) {
      const count = parseTrackCountFromText(text);
      if (count != null) return count;
    }
  }

  return findPlaylistTrackCountInTree(data);
}

async function countPlaylistTracksFromShelfData(
  initialData: Record<string, unknown>,
): Promise<number | null> {
  try {
    const shelf = findPlaylistShelf(initialData);
    if (!shelf) return null;

    const seen = new Set<string>();
    let items = shelf.contents;
    let continuation = continuationToken(items);
    let pages = 0;

    while (true) {
      for (const item of items) {
        if (item.continuationItemRenderer) continue;
        const renderer = item.musicResponsiveListItemRenderer;
        if (!renderer) continue;
        const videoId = videoIdFromRenderer(renderer);
        const columns = renderer.flexColumns ?? [];
        const title = textFromRuns(
          columns[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs,
        );
        const key = videoId ?? title;
        if (!key || seen.has(key)) continue;
        seen.add(key);
      }

      if (!continuation || pages >= COUNT_SHELF_MAX_PAGES) break;

      await delay(50);
      const nextPage = await ytmPost({ continuation });
      items = parseContinuationItems(nextPage);
      continuation = continuationToken(items);
      pages++;
      if (items.length === 0) break;
    }

    return seen.size > 0 ? seen.size : null;
  } catch {
    return null;
  }
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

function findPlaylistThumbnail(data: Record<string, unknown>): string | null {
  function walk(node: unknown, depth = 0): string | null {
    if (depth > 12 || node == null || typeof node !== 'object') return null;

    if (Array.isArray(node)) {
      for (const item of node) {
        const found = walk(item, depth + 1);
        if (found) return found;
      }
      return null;
    }

    const obj = node as Record<string, unknown>;
    if (obj.musicResponsiveHeaderRenderer && typeof obj.musicResponsiveHeaderRenderer === 'object') {
      const header = obj.musicResponsiveHeaderRenderer as {
        thumbnail?: {
          musicThumbnailRenderer?: {
            thumbnail?: { thumbnails?: Array<{ url?: string; width?: number }> };
          };
        };
      };
      const thumb = bestThumbnail(
        header.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails,
      );
      if (thumb) return thumb;
    }

    for (const value of Object.values(obj)) {
      const found = walk(value, depth + 1);
      if (found) return found;
    }
    return null;
  }

  return walk(data);
}

export async function scrapeYouTubeMusicFromLink(
  playlistId: string,
  playerId: string,
  onProgress?: ScrapeProgressCallback,
): Promise<{
  tracks: NormalizedTrack[];
  sourceName: string;
  thumbnailUrl?: string | null;
  truncated?: boolean;
}> {
  onProgress?.({
    phase: 'opening',
    loaded: 0,
    total: null,
    label: 'Opening YouTube Music…',
  });

  let data: Record<string, unknown>;
  try {
    data = await ytmPost({ browseId: toYouTubeBrowseId(playlistId) });
  } catch {
    throw new ScrapeError(
      'Could not open that YouTube Music playlist. Check that the link is public.',
    );
  }

  const sourceName = findPlaylistTitle(data) ?? 'YouTube Music import';
  const thumbnailUrl = findPlaylistThumbnail(data);
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
      if (tracks.length >= YTM_IMPORT_MAX_TRACKS) break;
    }

    onProgress?.({
      phase: 'loading',
      loaded: tracks.length,
      total: continuation ? null : tracks.length,
      label: 'Loading tracks…',
    });

    if (tracks.length >= YTM_IMPORT_MAX_TRACKS || !continuation) break;

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
  const truncated = tracks.length >= YTM_IMPORT_MAX_TRACKS;
  return {
    tracks,
    sourceName,
    thumbnailUrl: thumbnailUrl ?? tracks[0]?.albumArtUrl ?? null,
    truncated: truncated || undefined,
  };
}

export interface YtmPlaylistSearchHit {
  id: string;
  browseId: string;
  name: string;
  author?: string;
  trackCount?: number;
  thumbnailUrl?: string;
  url: string;
}

function parseAuthorFromSubtitle(subtitle: string): string | undefined {
  const parts = subtitle.split('•').map((part) => part.trim());
  const authorPart = parts.find(
    (part) =>
      part &&
      !/\d[\d,]*\s+(songs?|tracks?|videos?)/i.test(part) &&
      !/^playlist$/i.test(part),
  );
  return authorPart || undefined;
}

function hitFromBrowseId(
  browseId: string,
  title: string,
  subtitle: string,
  thumbnailUrl?: string,
  extraCountText = '',
): YtmPlaylistSearchHit | null {
  if (!browseId.startsWith('VL') || !title) return null;
  const playlistId = browseId.slice(2);
  return {
    id: playlistId,
    browseId,
    name: title,
    author: parseAuthorFromSubtitle(subtitle),
    trackCount:
      parseTrackCountFromText(subtitle) ??
      parseTrackCountFromText(extraCountText) ??
      undefined,
    thumbnailUrl,
    url: `https://music.youtube.com/browse/${browseId}`,
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
  const countHint = textFromRuns(
    columns[2]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs,
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
    countHint,
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

function shelfHasImportableTracks(shelf: { contents: YtmListItem[] }): boolean {
  return shelf.contents.some(
    (item) =>
      item.musicResponsiveListItemRenderer &&
      !item.continuationItemRenderer &&
      videoIdFromRenderer(item.musicResponsiveListItemRenderer),
  );
}

export async function isYouTubeMusicPlaylistImportable(browseId: string): Promise<boolean> {
  try {
    const data = await ytmPost({ browseId: toYouTubeBrowseId(browseId) });
    const shelf = findPlaylistShelf(data);
    return shelf ? shelfHasImportableTracks(shelf) : false;
  } catch {
    return false;
  }
}

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
): Promise<{ name: string | null; trackCount: number | null; browseId: string }> {
  const browseId = toYouTubeBrowseId(playlistId);
  try {
    const data = await ytmPost({ browseId });
    let trackCount = findPlaylistTrackCount(data);
    if (trackCount == null) {
      trackCount = await countPlaylistTracksFromShelfData(data);
    }
    return {
      name: findPlaylistTitle(data),
      trackCount,
      browseId,
    };
  } catch {
    return { name: null, trackCount: null, browseId };
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

  const enriched = await enrichPlaylistTrackCounts(deduped);

  const importable: YtmPlaylistSearchHit[] = [];
  for (let i = 0; i < enriched.length; i += ENRICH_BATCH_SIZE) {
    const batch = enriched.slice(i, i + ENRICH_BATCH_SIZE);
    const checks = await Promise.all(
      batch.map(async (hit) => ({
        hit,
        ok: await isYouTubeMusicPlaylistImportable(hit.browseId),
      })),
    );
    for (const { hit, ok } of checks) {
      if (ok) importable.push(hit);
    }
    if (i + ENRICH_BATCH_SIZE < enriched.length) await delay(60);
  }

  return importable;
}
