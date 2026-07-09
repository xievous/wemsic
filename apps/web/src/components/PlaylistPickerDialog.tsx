import type {
  CatalogSearchResult,
  PresetCatalogResponse,
  PresetCategory,
  PresetPlaylist,
} from '@wemsic/shared';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import GraphicEqRoundedIcon from '@mui/icons-material/GraphicEqRounded';
import LibraryMusicRoundedIcon from '@mui/icons-material/LibraryMusicRounded';
import MusicNoteRoundedIcon from '@mui/icons-material/MusicNoteRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import TheatersRoundedIcon from '@mui/icons-material/TheatersRounded';
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded';
import {
  Box,
  Chip,
  CircularProgress,
  Dialog,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchPresetPlaylists, searchCatalog } from '../api/client';

type CategoryFilter = 'all' | PresetCategory;

const CATEGORY_LABELS: Record<PresetCategory, string> = {
  trending: 'Trending',
  genre: 'Genres',
  theme: 'Themes',
};

const CATEGORY_ACCENTS: Record<PresetCategory, { from: string; to: string }> = {
  trending: { from: '#3A6BFF', to: '#6C5CE7' },
  genre: { from: '#00BFD8', to: '#16C79A' },
  theme: { from: '#6C5CE7', to: '#2DB7FF' },
};

function sourceLabel(source: CatalogSearchResult['source']): string {
  switch (source) {
    case 'preset':
      return 'Curated';
    case 'spotify':
      return 'Spotify';
    case 'apple':
      return 'Apple Music';
    case 'youtube':
      return 'YouTube Music';
  }
}

function formatTrackCount(count: number | undefined): string {
  if (count == null) return 'Length unknown';
  return `${count.toLocaleString()} track${count === 1 ? '' : 's'}`;
}

function presetToResult(preset: PresetPlaylist): CatalogSearchResult {
  return {
    id: preset.id,
    name: preset.name,
    description: preset.description,
    url: preset.url,
    trackCount: preset.estimatedTracks,
    source: 'preset',
  };
}

function CategoryIcon({ category }: { category: PresetCategory }) {
  const sx = { fontSize: 20, opacity: 0.9 };
  switch (category) {
    case 'trending':
      return <TrendingUpRoundedIcon sx={sx} />;
    case 'genre':
      return <GraphicEqRoundedIcon sx={sx} />;
    case 'theme':
      return <TheatersRoundedIcon sx={sx} />;
  }
}

function PlaylistPickCard({
  item,
  onSelect,
  disabled,
  variant = 'grid',
  category,
}: {
  item: CatalogSearchResult;
  onSelect: (item: CatalogSearchResult) => void | Promise<void>;
  disabled?: boolean;
  variant?: 'featured' | 'grid' | 'search';
  category?: PresetCategory;
}) {
  const accent = category ? CATEGORY_ACCENTS[category] : null;
  const isFeatured = variant === 'featured';

  return (
    <Box
      role="button"
      tabIndex={disabled ? -1 : 0}
      onClick={() => !disabled && void onSelect(item)}
      onKeyDown={(e) => {
        if (!disabled && (e.key === 'Enter' || e.key === ' ')) void onSelect(item);
      }}
      sx={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        minHeight: isFeatured ? 148 : variant === 'search' ? 132 : 128,
        p: isFeatured ? 2 : 1.75,
        borderRadius: isFeatured ? '20px' : '18px',
        border: '1px solid rgba(20,33,63,0.08)',
        bgcolor: 'background.paper',
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.55 : 1,
        overflow: 'hidden',
        transition: 'transform 160ms cubic-bezier(0.16,1,0.3,1), box-shadow 160ms ease, border-color 160ms ease',
        boxShadow: isFeatured
          ? '0 16px 36px -22px rgba(58,107,255,0.45)'
          : '0 10px 28px -20px rgba(20,33,63,0.18)',
        '&:hover': disabled
          ? undefined
          : {
              transform: 'translateY(-3px)',
              borderColor: 'rgba(58,107,255,0.35)',
              boxShadow: isFeatured
                ? '0 22px 44px -18px rgba(58,107,255,0.5)'
                : '0 18px 36px -16px rgba(20,33,63,0.24)',
            },
        '&::before': accent
          ? {
              content: '""',
              position: 'absolute',
              inset: 0,
              background: `linear-gradient(135deg, ${accent.from}18 0%, ${accent.to}10 55%, transparent 100%)`,
              pointerEvents: 'none',
            }
          : undefined,
      }}
    >
      <Box sx={{ position: 'relative', zIndex: 1 }}>
        <Stack direction="row" spacing={1.25} alignItems="flex-start" sx={{ mb: 1 }}>
          <Box
            sx={{
              width: isFeatured ? 52 : 44,
              height: isFeatured ? 52 : 44,
              borderRadius: '14px',
              flexShrink: 0,
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: item.thumbnailUrl ? 'transparent' : accent ? `${accent.from}22` : 'rgba(58,107,255,0.1)',
              color: accent?.from ?? 'primary.main',
            }}
          >
            {item.thumbnailUrl ? (
              <Box
                component="img"
                src={item.thumbnailUrl}
                alt=""
                sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : category ? (
              <CategoryIcon category={category} />
            ) : (
              <MusicNoteRoundedIcon sx={{ fontSize: isFeatured ? 26 : 22 }} />
            )}
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              fontWeight={700}
              sx={{
                fontSize: isFeatured ? '1.05rem' : '0.95rem',
                lineHeight: 1.25,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {item.name}
            </Typography>
            {item.description && (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  mt: 0.35,
                  display: '-webkit-box',
                  WebkitLineClamp: isFeatured ? 2 : 1,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  fontSize: isFeatured ? '0.85rem' : '0.78rem',
                }}
              >
                {item.description}
              </Typography>
            )}
          </Box>
        </Stack>
      </Box>

      <Stack
        direction="row"
        spacing={0.75}
        flexWrap="wrap"
        useFlexGap
        sx={{ position: 'relative', zIndex: 1, mt: 'auto', pt: 0.5 }}
      >
        {category && (
          <Chip
            label={CATEGORY_LABELS[category]}
            size="small"
            sx={{
              height: 24,
              fontSize: '0.68rem',
              bgcolor: accent ? `${accent.from}14` : undefined,
              color: accent?.from ?? 'text.secondary',
              border: 'none',
            }}
          />
        )}
        <Chip
          label={sourceLabel(item.source)}
          size="small"
          variant="outlined"
          sx={{ height: 24, fontSize: '0.68rem' }}
        />
        <Chip
          label={formatTrackCount(item.trackCount)}
          size="small"
          variant="outlined"
          sx={{ height: 24, fontSize: '0.68rem' }}
        />
      </Stack>
    </Box>
  );
}

function FeaturedPresetRow({
  presets,
  onSelect,
  disabled,
}: {
  presets: PresetPlaylist[];
  onSelect: (item: CatalogSearchResult) => void | Promise<void>;
  disabled?: boolean;
}) {
  if (presets.length === 0) return null;

  return (
    <Box sx={{ mb: 3 }}>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5, px: 0.25 }}>
        <AutoAwesomeRoundedIcon sx={{ fontSize: 18, color: 'primary.main' }} />
        <Typography variant="subtitle2" fontWeight={700}>
          Popular picks
        </Typography>
      </Stack>
      <Box
        sx={{
          display: 'flex',
          gap: 1.5,
          overflowX: 'auto',
          pb: 0.5,
          mx: -0.5,
          px: 0.5,
          scrollSnapType: 'x mandatory',
          WebkitOverflowScrolling: 'touch',
          '&::-webkit-scrollbar': { height: 6 },
          '&::-webkit-scrollbar-thumb': {
            bgcolor: 'rgba(20,33,63,0.12)',
            borderRadius: 999,
          },
        }}
      >
        {presets.map((preset) => (
          <Box
            key={preset.id}
            sx={{
              flex: '0 0 auto',
              width: { xs: 240, sm: 260, md: 280 },
              scrollSnapAlign: 'start',
            }}
          >
            <PlaylistPickCard
              item={presetToResult(preset)}
              category="trending"
              variant="featured"
              onSelect={onSelect}
              disabled={disabled}
            />
          </Box>
        ))}
      </Box>
    </Box>
  );
}

export function PlaylistPickerDialog({
  open,
  onClose,
  onSelect,
  disabled,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (item: CatalogSearchResult) => Promise<void>;
  disabled?: boolean;
}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [presets, setPresets] = useState<PresetCatalogResponse | null>(null);
  const [presetsLoading, setPresetsLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<CatalogSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [importingSelection, setImportingSelection] = useState(false);
  const [pickerError, setPickerError] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setDebouncedQuery('');
    setSearchResults([]);
    setSearchError(null);
    setPickerError(null);
    setCategoryFilter('all');
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setPresetsLoading(true);
    fetchPresetPlaylists()
      .then(setPresets)
      .catch(() => setPresets(null))
      .finally(() => setPresetsLoading(false));
  }, [open]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  const runSearch = useCallback(async (q: string) => {
    if (!q) {
      setSearchResults([]);
      setSearchError(null);
      return;
    }
    setSearching(true);
    setSearchError(null);
    try {
      const data = await searchCatalog(q);
      setSearchResults(data.results);
    } catch (e) {
      setSearchResults([]);
      setSearchError(e instanceof Error ? e.message : 'Search failed');
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    void runSearch(debouncedQuery);
  }, [debouncedQuery, runSearch]);

  const handleSelect = async (item: CatalogSearchResult) => {
    if (!item.url || importingSelection) return;
    setImportingSelection(true);
    setPickerError(null);
    try {
      await onSelect(item);
      onClose();
    } catch (e) {
      setPickerError(e instanceof Error ? e.message : 'Import failed');
    } finally {
      setImportingSelection(false);
    }
  };

  const pickerBusy = disabled || importingSelection;
  const showSearch = debouncedQuery.length > 0;

  const filteredPresets = useMemo(() => {
    if (!presets) return [];
    if (categoryFilter === 'all') {
      return [
        ...presets.genre.map((p) => ({ preset: p, category: 'genre' as const })),
        ...presets.theme.map((p) => ({ preset: p, category: 'theme' as const })),
      ];
    }
    return presets[categoryFilter].map((preset) => ({ preset, category: categoryFilter }));
  }, [presets, categoryFilter]);

  const categoryCounts = useMemo(() => {
    if (!presets) return { all: 0, trending: 0, genre: 0, theme: 0 };
    return {
      all: presets.trending.length + presets.genre.length + presets.theme.length,
      trending: presets.trending.length,
      genre: presets.genre.length,
      theme: presets.theme.length,
    };
  }, [presets]);

  return (
    <Dialog
      open={open}
      onClose={pickerBusy ? undefined : onClose}
      fullWidth
      fullScreen={isMobile}
      maxWidth="lg"
      PaperProps={{
        sx: {
          borderRadius: isMobile ? 0 : '24px',
          overflow: 'hidden',
          maxHeight: isMobile ? '100%' : 'min(92vh, 880px)',
          bgcolor: '#F8FBFF',
        },
      }}
    >
      <Box
        sx={{
          px: { xs: 2, sm: 3, md: 4 },
          pt: { xs: 2, sm: 2.5 },
          pb: 2,
          borderBottom: '1px solid rgba(20,33,63,0.06)',
          background:
            'linear-gradient(180deg, rgba(58,107,255,0.07) 0%, rgba(58,107,255,0.02) 55%, transparent 100%)',
        }}
      >
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={2}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mb: 0.5 }}>
              <LibraryMusicRoundedIcon color="primary" />
              <Typography variant="h5" fontWeight={700}>
                Add a playlist
              </Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 560 }}>
              Search Spotify, Apple Music & YouTube — or pick a curated playlist to import.
            </Typography>
          </Box>
          <IconButton
            onClick={onClose}
            disabled={pickerBusy}
            aria-label="Close"
            sx={{
              bgcolor: 'background.paper',
              border: '1px solid rgba(20,33,63,0.08)',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.95)' },
            }}
          >
            <CloseRoundedIcon />
          </IconButton>
        </Stack>

        <TextField
          fullWidth
          placeholder="Try eurovision, disney, 90s, k-pop…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          disabled={pickerBusy}
          sx={{ mt: 2.5 }}
          slotProps={{
            input: {
              sx: {
                py: 1.35,
                fontSize: '1rem',
                bgcolor: 'background.paper',
                borderRadius: '16px',
              },
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRoundedIcon color="primary" />
                </InputAdornment>
              ),
              endAdornment: searching ? (
                <InputAdornment position="end">
                  <CircularProgress size={20} />
                </InputAdornment>
              ) : undefined,
            },
          }}
        />

        {(pickerError || searchError) && (
          <Typography variant="body2" color="error" sx={{ mt: 1.5 }}>
            {pickerError ?? searchError}
          </Typography>
        )}
      </Box>

      <Box
        sx={{
          px: { xs: 2, sm: 3, md: 4 },
          py: { xs: 2, sm: 2.5, md: 3 },
          overflowY: 'auto',
          flex: 1,
        }}
      >
        {showSearch ? (
          <>
            {!searching && searchResults.length > 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {searchResults.length} result{searchResults.length === 1 ? '' : 's'} for &ldquo;
                {debouncedQuery}&rdquo;
              </Typography>
            )}
            {!searching && searchResults.length === 0 && !searchError && (
              <Box sx={{ py: 6, textAlign: 'center' }}>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  No playlists found
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 420, mx: 'auto' }}>
                  Try another theme, or clear search to browse our curated picks below.
                </Typography>
              </Box>
            )}
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  sm: 'repeat(2, 1fr)',
                  md: 'repeat(3, 1fr)',
                },
                gap: 1.5,
              }}
            >
              {searchResults.map((item) => (
                <PlaylistPickCard
                  key={item.id}
                  item={item}
                  variant="search"
                  onSelect={handleSelect}
                  disabled={pickerBusy || !item.url}
                />
              ))}
            </Box>
          </>
        ) : presetsLoading ? (
          <Stack alignItems="center" py={8}>
            <CircularProgress size={32} />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Loading curated playlists…
            </Typography>
          </Stack>
        ) : presets ? (
          <>
            {categoryFilter === 'all' && (
              <FeaturedPresetRow
                presets={presets.trending}
                onSelect={handleSelect}
                disabled={pickerBusy}
              />
            )}

            <Stack
              direction="row"
              spacing={1}
              flexWrap="wrap"
              useFlexGap
              sx={{ mb: 2.5 }}
            >
              {(
                [
                  ['all', 'All playlists'],
                  ['trending', CATEGORY_LABELS.trending],
                  ['genre', CATEGORY_LABELS.genre],
                  ['theme', CATEGORY_LABELS.theme],
                ] as const
              ).map(([key, label]) => (
                <Chip
                  key={key}
                  label={`${label} (${categoryCounts[key]})`}
                  clickable
                  onClick={() => setCategoryFilter(key)}
                  color={categoryFilter === key ? 'primary' : 'default'}
                  variant={categoryFilter === key ? 'filled' : 'outlined'}
                  sx={{ fontWeight: 600, height: 34 }}
                />
              ))}
            </Stack>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: 'repeat(2, 1fr)',
                  sm: 'repeat(3, 1fr)',
                  md: 'repeat(4, 1fr)',
                },
                gap: 1.5,
              }}
            >
              {filteredPresets.length === 0 ? (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ gridColumn: '1 / -1', py: 2, textAlign: 'center' }}
                >
                  No playlists in this category.
                </Typography>
              ) : (
                filteredPresets.map(({ preset, category }) => (
                  <PlaylistPickCard
                    key={preset.id}
                    item={presetToResult(preset)}
                    category={category}
                    onSelect={handleSelect}
                    disabled={pickerBusy}
                  />
                ))
              )}
            </Box>
          </>
        ) : (
          <Box sx={{ py: 6, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Could not load curated playlists. Use search to find playlists instead.
            </Typography>
          </Box>
        )}
      </Box>

      {importingSelection && (
        <Box
          sx={{
            px: 3,
            py: 1.5,
            borderTop: '1px solid rgba(20,33,63,0.06)',
            bgcolor: 'background.paper',
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
          }}
        >
          <CircularProgress size={18} />
          <Typography variant="body2" fontWeight={600}>
            Importing playlist…
          </Typography>
        </Box>
      )}
    </Dialog>
  );
}
