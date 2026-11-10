import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  IconButton,
  InputAdornment,
  LinearProgress,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import type { CatalogSearchResult, Player, PlaylistImportProgressPayload } from '@wemsic/shared';
import { useEffect, useMemo, useRef, useState } from 'react';
import { fetchPresetPlaylists, searchCatalog } from '../../api/client';
import { CoverArt, COVER_SIZE } from '../../components/CoverArt';
import { CoverCaption, CoverCarousel } from '../../components/CoverCarousel';
import { carouselItems, looksLikeLink, presetResults, type CoverItem } from './coverItems';
import type { PlaylistImport } from './usePlaylistImport';

/** The cards' horizontal padding (theme spacing), which the carousel bleeds into. */
const CARD_PAD = { xs: 2.5, sm: 3 };
const SEARCH_DELAY_MS = 300;

function ImportProgressBar({ progress }: { progress: PlaylistImportProgressPayload }) {
  const hasTotal = progress.total != null && progress.total > 0;
  const total = progress.total ?? 0;
  const value = hasTotal ? Math.min(100, Math.round((progress.loaded / total) * 100)) : undefined;

  return (
    <Box sx={{ mt: 1.5 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="baseline" spacing={1} sx={{ mb: 0.75 }}>
        <Typography variant="body2" color="text.secondary" fontWeight={600}>
          {progress.label ?? 'Scanning playlist…'}
        </Typography>
        {hasTotal && (
          <Typography variant="body2" color="primary.main" fontWeight={700} sx={{ flexShrink: 0 }}>
            {progress.loaded.toLocaleString()} / {total.toLocaleString()}
          </Typography>
        )}
      </Stack>
      <LinearProgress variant={hasTotal ? 'determinate' : 'indeterminate'} value={value} sx={{ height: 6 }} />
    </Box>
  );
}

/** Live catalog search for the words in the field; stale answers are dropped. */
function useCatalogSearch(query: string) {
  const [results, setResults] = useState<CatalogSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const latest = useRef('');

  useEffect(() => {
    latest.current = query;
    if (!query) {
      setSearching(false);
      setError(null);
      return;
    }
    setSearching(true);
    const timer = window.setTimeout(async () => {
      try {
        const data = await searchCatalog(query);
        if (latest.current !== query) return;
        setResults(data.results);
        setError(null);
      } catch (e) {
        if (latest.current !== query) return;
        setResults([]);
        setError(e instanceof Error ? e.message : 'Search failed');
      } finally {
        if (latest.current === query) setSearching(false);
      }
    }, SEARCH_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [query]);

  return { results, searching, error };
}

/**
 * "Music": one field to search playlists or paste a link, over a carousel of
 * popular covers (or the search results while searching). Tapping a cover adds
 * it; added playlists leave the carousel for the Your playlists card below.
 */
export function MusicCard({ me, imports }: { me: Player | undefined; imports: PlaylistImport }) {
  const [text, setText] = useState('');
  const [presets, setPresets] = useState<CatalogSearchResult[] | null>(null);
  const [presetsFailed, setPresetsFailed] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const { importing, progress } = imports;

  const trimmed = text.trim();
  const isLink = looksLikeLink(trimmed);
  const query = isLink ? '' : trimmed;
  const search = useCatalogSearch(query);
  const myPlaylists = useMemo(() => me?.playlists ?? [], [me?.playlists]);

  useEffect(() => {
    fetchPresetPlaylists()
      .then((catalog) => setPresets(presetResults(catalog)))
      .catch(() => setPresetsFailed(true));
  }, []);

  const searchingNow = query.length > 0;
  const items = carouselItems(searchingNow ? search.results : (presets ?? []), myPlaylists, {
    showSource: searchingNow,
  });

  async function pick(item: CoverItem) {
    setBusyKey(item.key);
    try {
      await imports.importFromCatalog(item.result);
    } catch {
      // The lobby's message bar shows what went wrong.
    } finally {
      setBusyKey(null);
    }
  }

  async function addLink() {
    if (await imports.importFromUrl(trimmed)) setText('');
  }

  const empty = searchingNow ? (
    <Typography color="text.secondary">
      {search.error ?? `No playlists found for “${query}”. Try an artist, a decade or a mood.`}
    </Typography>
  ) : presetsFailed ? (
    <Typography color="text.secondary">Couldn’t load the popular playlists. Search or paste a link instead.</Typography>
  ) : (
    <Typography color="text.secondary">You’ve added every popular playlist. Search for more.</Typography>
  );

  return (
    <>
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: CARD_PAD, '&:last-child': { pb: { xs: 1.5, sm: 2 } } }}>
          <Typography variant="h5" sx={{ fontSize: { xs: '1.5rem', sm: '1.7rem' }, mb: 2 }}>
            Music
          </Typography>
          <TextField
            fullWidth
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && isLink && !importing) void addLink();
              if (e.key === 'Escape') setText('');
            }}
            placeholder="Search playlists or paste a link"
            disabled={importing && isLink}
            slotProps={{
              htmlInput: { 'aria-label': 'Search playlists or paste a link' },
              input: {
                sx: { fontSize: '1.1rem', py: 0.5 },
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchRoundedIcon />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    {text && !isLink && (
                      <IconButton aria-label="Clear search" onClick={() => setText('')} edge="end">
                        <CloseRoundedIcon />
                      </IconButton>
                    )}
                    {isLink && (
                      <Button
                        variant="contained"
                        onClick={() => void addLink()}
                        disabled={importing}
                        startIcon={importing ? <CircularProgress size={16} color="inherit" /> : undefined}
                        sx={{ py: 0.75, px: 2.5 }}
                      >
                        {importing ? 'Adding…' : 'Add'}
                      </Button>
                    )}
                  </InputAdornment>
                ),
              },
            }}
          />
          {progress && <ImportProgressBar progress={progress} />}
          {searchingNow && (
            <Typography color="text.secondary" fontWeight={600} sx={{ mt: 2, mb: -0.5 }}>
              {search.searching ? `Searching for “${query}”…` : `${items.length} results for “${query}”`}
            </Typography>
          )}
          <Box sx={{ mt: 1.5 }}>
            <CoverCarousel
              items={items}
              onPick={(item) => void pick(item)}
              busyKey={busyKey}
              disabled={importing}
              loading={searchingNow ? search.searching : presets === null && !presetsFailed}
              empty={empty}
              bleed={CARD_PAD}
            />
          </Box>
        </CardContent>
      </Card>

      <YourPlaylists me={me} imports={imports} />
    </>
  );
}

/**
 * Everything this player added, as covers the same size as the carousel's,
 * wrapping onto new rows. Hover one (always visible on touch) to remove it.
 */
function YourPlaylists({ me, imports }: { me: Player | undefined; imports: PlaylistImport }) {
  const playlists = me?.playlists ?? [];
  const total = playlists.reduce((sum, p) => sum + p.trackCount, 0);
  const { removingPlaylistId, importing } = imports;

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent sx={{ p: CARD_PAD }}>
        <Stack direction="row" spacing={1.5} alignItems="baseline" sx={{ mb: 2 }}>
          <Typography variant="h5" sx={{ fontSize: { xs: '1.5rem', sm: '1.7rem' } }}>
            Your playlists
          </Typography>
          {playlists.length > 0 && (
            <Typography color="text.secondary" fontWeight={600}>
              {playlists.length} · {total.toLocaleString()} songs
            </Typography>
          )}
        </Stack>
        {playlists.length === 0 ? (
          <Typography color="text.secondary">Nothing yet. Tap a cover above, search, or paste a playlist link.</Typography>
        ) : (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: `repeat(auto-fill, ${COVER_SIZE.xs}px)`,
                sm: `repeat(auto-fill, ${COVER_SIZE.sm}px)`,
              },
              rowGap: 2,
              columnGap: 1.75,
              pt: 1,
            }}
          >
            {playlists.map((p) => {
              const removing = removingPlaylistId === p.id;
              return (
                <Box
                  key={p.id}
                  sx={{
                    position: 'relative',
                    minWidth: 0,
                    opacity: removing ? 0.45 : 1,
                    transition: 'opacity 160ms ease',
                    '&:hover .remove, &:focus-within .remove': { opacity: 1 },
                  }}
                >
                  <CoverArt name={p.name} imageUrl={p.thumbnailUrl} />
                  <CoverCaption name={p.name} meta={`${p.trackCount.toLocaleString()} songs`} />
                  <IconButton
                    className="remove"
                    size="small"
                    aria-label={`Remove ${p.name}`}
                    disabled={removing || importing}
                    onClick={() => void imports.removePlaylist(p.id)}
                    sx={{
                      position: 'absolute',
                      top: -10,
                      left: -8,
                      width: 30,
                      height: 30,
                      bgcolor: 'background.paper',
                      border: '1px solid rgba(20,33,63,0.12)',
                      boxShadow: '0 4px 12px -6px rgba(14,26,60,0.35)',
                      color: 'text.secondary',
                      opacity: 0,
                      transition: 'opacity 140ms ease, color 140ms ease',
                      '@media (hover: none)': { opacity: 1 },
                      '&:hover': { color: 'error.main', bgcolor: '#FFF0F3', borderColor: 'rgba(255,84,112,0.25)' },
                      '&.Mui-disabled': { bgcolor: 'background.paper' },
                    }}
                  >
                    <CloseRoundedIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Box>
              );
            })}
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
