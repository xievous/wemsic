import type { CatalogSearchResult, PresetCatalogResponse, PresetPlaylist } from '@wemsic/shared';
import LibraryMusicRoundedIcon from '@mui/icons-material/LibraryMusicRounded';
import MusicNoteRoundedIcon from '@mui/icons-material/MusicNoteRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import {
  Box,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import { fetchPresetPlaylists, searchCatalog } from '../api/client';

const CATEGORY_LABELS: Record<string, string> = {
  trending: 'Trending',
  genre: 'Genres',
  theme: 'Themes',
};

function sourceLabel(source: CatalogSearchResult['source']): string {
  switch (source) {
    case 'preset':
      return 'Preset';
    case 'spotify':
      return 'Spotify';
    case 'apple':
      return 'Apple Music';
    case 'youtube':
      return 'YouTube Music';
  }
}

function sourceChipColor(
  source: CatalogSearchResult['source'],
): 'primary' | 'secondary' | 'success' | 'default' {
  switch (source) {
    case 'preset':
      return 'primary';
    case 'spotify':
      return 'success';
    case 'apple':
      return 'default';
    case 'youtube':
      return 'secondary';
  }
}

function formatTrackCount(count: number | undefined): string {
  if (count == null) return 'Track count unknown';
  return `${count.toLocaleString()} track${count === 1 ? '' : 's'}`;
}

function PlaylistRow({
  item,
  onSelect,
  disabled,
}: {
  item: CatalogSearchResult;
  onSelect: (item: CatalogSearchResult) => void | Promise<void>;
  disabled?: boolean;
}) {
  return (
    <Box
      role="button"
      tabIndex={disabled ? -1 : 0}
      onClick={() => !disabled && void onSelect(item)}
      onKeyDown={(e) => {
        if (!disabled && (e.key === 'Enter' || e.key === ' ')) void onSelect(item);
      }}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        p: 1.5,
        borderRadius: '14px',
        border: '1px solid rgba(20,33,63,0.08)',
        bgcolor: 'background.paper',
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        transition: 'all 140ms ease',
        '&:hover': disabled
          ? undefined
          : {
              borderColor: 'primary.main',
              bgcolor: 'rgba(58,107,255,0.04)',
              transform: 'translateY(-1px)',
            },
      }}
    >
      <Box
        sx={{
          width: 48,
          height: 48,
          borderRadius: '10px',
          flexShrink: 0,
          bgcolor: 'rgba(58,107,255,0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {item.thumbnailUrl ? (
          <Box
            component="img"
            src={item.thumbnailUrl}
            alt=""
            sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <MusicNoteRoundedIcon color="primary" />
        )}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography fontWeight={600} noWrap>
          {item.name}
        </Typography>
        {item.description && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
            {item.description}
          </Typography>
        )}
        <Stack direction="row" spacing={0.75} sx={{ mt: 0.5 }} flexWrap="wrap" useFlexGap>
          <Chip
            label={sourceLabel(item.source)}
            size="small"
            color={sourceChipColor(item.source)}
            variant="outlined"
            sx={{ height: 22, fontSize: '0.7rem' }}
          />
          <Chip
            label={formatTrackCount(item.trackCount)}
            size="small"
            variant="outlined"
            sx={{ height: 22, fontSize: '0.7rem' }}
          />
        </Stack>
      </Box>
    </Box>
  );
}

function PresetCard({
  preset,
  onSelect,
  disabled,
}: {
  preset: PresetPlaylist;
  onSelect: (item: CatalogSearchResult) => void | Promise<void>;
  disabled?: boolean;
}) {
  const item: CatalogSearchResult = {
    id: preset.id,
    name: preset.name,
    description: preset.description,
    url: preset.url,
    trackCount: preset.estimatedTracks,
    source: 'preset',
  };

  return (
    <Box
      role="button"
      tabIndex={disabled ? -1 : 0}
      onClick={() => !disabled && void onSelect(item)}
      onKeyDown={(e) => {
        if (!disabled && (e.key === 'Enter' || e.key === ' ')) void onSelect(item);
      }}
      sx={{
        p: 1.75,
        borderRadius: '16px',
        border: '1px solid rgba(20,33,63,0.08)',
        bgcolor: 'background.paper',
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        transition: 'all 140ms ease',
        '&:hover': disabled
          ? undefined
          : {
              borderColor: 'primary.main',
              bgcolor: 'rgba(58,107,255,0.04)',
              transform: 'translateY(-2px)',
            },
      }}
    >
      <Typography fontWeight={700} gutterBottom>
        {preset.name}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        {preset.description}
      </Typography>
      <Chip
        label={formatTrackCount(preset.estimatedTracks)}
        size="small"
        variant="outlined"
        sx={{ height: 22, fontSize: '0.7rem' }}
      />
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
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [presets, setPresets] = useState<PresetCatalogResponse | null>(null);
  const [presetsLoading, setPresetsLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<CatalogSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [importingSelection, setImportingSelection] = useState(false);
  const [pickerError, setPickerError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setDebouncedQuery('');
    setSearchResults([]);
    setSearchError(null);
    setPickerError(null);
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

  return (
    <Dialog
      open={open}
      onClose={pickerBusy ? undefined : onClose}
      fullWidth
      maxWidth="sm"
      PaperProps={{ sx: { borderRadius: '20px' } }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <LibraryMusicRoundedIcon color="primary" />
          <span>Choose playlist</span>
        </Stack>
      </DialogTitle>
      <DialogContent sx={{ pt: 1, pb: 3 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Search playlists — eurovision, disney, 90s…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          disabled={pickerBusy}
          sx={{ mb: 2.5 }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRoundedIcon fontSize="small" color="action" />
                </InputAdornment>
              ),
              endAdornment: searching ? (
                <InputAdornment position="end">
                  <CircularProgress size={18} />
                </InputAdornment>
              ) : undefined,
            },
          }}
        />

        {showSearch ? (
          <Stack spacing={1}>
            {!searching && searchResults.length > 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                Pick a playlist to import — track counts shown for each result.
              </Typography>
            )}
            {pickerError && (
              <Typography variant="body2" color="error">
                {pickerError}
              </Typography>
            )}
            {searchError && (
              <Typography variant="body2" color="error">
                {searchError}
              </Typography>
            )}
            {!searching && searchResults.length === 0 && !searchError && (
              <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                No playlists found for &ldquo;{debouncedQuery}&rdquo;. Try another search or paste a
                link below.
              </Typography>
            )}
            {searchResults.map((item) => (
              <PlaylistRow
                key={item.id}
                item={item}
                onSelect={handleSelect}
                disabled={pickerBusy || !item.url}
              />
            ))}
          </Stack>
        ) : presetsLoading ? (
          <Stack alignItems="center" py={4}>
            <CircularProgress size={28} />
          </Stack>
        ) : presets ? (
          <Stack spacing={2.5}>
            {(['trending', 'genre', 'theme'] as const).map((category) => {
              const items = presets[category];
              if (!items.length) return null;
              return (
                <Box key={category}>
                  <Typography variant="overline" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                    {CATEGORY_LABELS[category]}
                  </Typography>
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                      gap: 1.25,
                    }}
                  >
                    {items.map((preset: PresetPlaylist) => (
                      <PresetCard
                        key={preset.id}
                        preset={preset}
                        onSelect={handleSelect}
                        disabled={pickerBusy}
                      />
                    ))}
                  </Box>
                </Box>
              );
            })}
          </Stack>
        ) : (
          <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
            Could not load presets. Try searching for a theme instead.
          </Typography>
        )}
      </DialogContent>
    </Dialog>
  );
}
