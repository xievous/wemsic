import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import LinkRoundedIcon from '@mui/icons-material/LinkRounded';
import QueueMusicRoundedIcon from '@mui/icons-material/QueueMusicRounded';
import VolumeUpRoundedIcon from '@mui/icons-material/VolumeUpRounded';
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  LinearProgress,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { MIN_PLAYLIST_TRACKS } from '@wemsic/shared';
import type { Player, PlaylistImportProgressPayload } from '@wemsic/shared';
import { useState } from 'react';
import { useAudio } from '../../audio/AudioProvider';
import { MyPlaylistsStrip } from '../../components/MyPlaylistsStrip';
import { PlaylistPickerDialog } from '../../components/PlaylistPickerDialog';
import type { PlaylistImport } from './usePlaylistImport';

function ImportProgressBar({ progress }: { progress: PlaylistImportProgressPayload }) {
  const hasTotal = progress.total != null && progress.total > 0;
  const total = progress.total ?? 0;
  const value = hasTotal
    ? Math.min(100, Math.round((progress.loaded / total) * 100))
    : undefined;

  return (
    <Box
      sx={{
        py: 1.25,
        px: 1.5,
        borderRadius: '14px',
        bgcolor: 'rgba(58,107,255,0.05)',
        border: '1px solid rgba(58,107,255,0.1)',
      }}
    >
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="baseline"
        spacing={1}
        sx={{ mb: 0.75 }}
      >
        <Typography variant="caption" color="text.secondary" fontWeight={600}>
          {progress.label ?? 'Scanning playlist…'}
        </Typography>
        {hasTotal && (
          <Typography variant="caption" color="primary.main" fontWeight={700} sx={{ flexShrink: 0 }}>
            {progress.loaded.toLocaleString()} / {total.toLocaleString()}
          </Typography>
        )}
      </Stack>
      <LinearProgress
        variant={hasTotal ? 'determinate' : 'indeterminate'}
        value={value}
        sx={{
          height: 5,
          bgcolor: 'rgba(20,33,63,0.06)',
          '& .MuiLinearProgress-bar': {
            background: 'linear-gradient(90deg, #3A6BFF 0%, #6C5CE7 55%, #00BFD8 100%)',
          },
        }}
      />
    </Box>
  );
}

/**
 * "Your music" card: paste a link or open the playlist picker, see and remove
 * your playlists, and the per-device sound / ready buttons.
 */
export function MusicCard({
  me,
  imports,
  hostMode,
  isHost,
  onReadyChange,
}: {
  me: Player | undefined;
  imports: PlaylistImport;
  hostMode: boolean;
  isHost: boolean;
  onReadyChange: (ready: boolean) => void;
}) {
  const { enabled: soundOn, enableAudio } = useAudio();
  const [playlistUrl, setPlaylistUrl] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const { importing, progress, removingPlaylistId } = imports;

  // In host mode the host runs the shared screen (needs sound, never readies),
  // while players answer on their phones (no sound needed, must ready up).
  const needsSound = !hostMode || isHost;
  const needsReady = !hostMode || !isHost;

  async function handleImportFromUrl() {
    if (!playlistUrl.trim()) return;
    if (await imports.importFromUrl(playlistUrl.trim())) setPlaylistUrl('');
  }

  return (
    <>
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
          <Typography variant="h5" gutterBottom>
            Your music
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Paste a public Spotify, Apple Music, or YouTube Music playlist or album link (at least{' '}
            {MIN_PLAYLIST_TRACKS} tracks). Add as many as you like — songs are mixed fairly across
            players during the game.
          </Typography>
          <Stack spacing={1.5}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              <TextField
                label="Playlist or album link"
                placeholder="Spotify, Apple Music, or YouTube Music URL…"
                fullWidth
                size="small"
                value={playlistUrl}
                onChange={(e) => setPlaylistUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void handleImportFromUrl();
                }}
                disabled={importing}
              />
              <Button
                variant="contained"
                startIcon={importing ? <CircularProgress size={18} color="inherit" /> : <LinkRoundedIcon />}
                onClick={() => void handleImportFromUrl()}
                disabled={importing || !playlistUrl.trim()}
                sx={{ flexShrink: 0, minWidth: { sm: 120 } }}
              >
                {importing
                  ? progress?.total
                    ? `${Math.min(progress.loaded, progress.total).toLocaleString()}…`
                    : 'Scanning…'
                  : 'Add'}
              </Button>
            </Stack>
            {progress && <ImportProgressBar progress={progress} />}
            {me && me.playlists.length > 0 && (
              <MyPlaylistsStrip
                playlists={me.playlists}
                removingId={removingPlaylistId}
                onRemove={(id) => void imports.removePlaylist(id)}
                disabled={importing || removingPlaylistId !== null}
              />
            )}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} flexWrap="wrap" useFlexGap>
              <Button
                variant="outlined"
                startIcon={<QueueMusicRoundedIcon />}
                onClick={() => setPickerOpen(true)}
                disabled={importing}
              >
                Add playlist
              </Button>
              {needsSound && (
                <Button
                  variant={soundOn ? 'outlined' : 'contained'}
                  color={soundOn ? 'success' : 'secondary'}
                  startIcon={soundOn ? <CheckCircleRoundedIcon /> : <VolumeUpRoundedIcon />}
                  onClick={enableAudio}
                  disabled={soundOn}
                  sx={soundOn ? { '&.Mui-disabled': { color: 'success.main', borderColor: 'success.main', opacity: 0.9 } } : undefined}
                >
                  {soundOn ? 'Sound ready' : 'Enable sound'}
                </Button>
              )}
              {needsReady && (
                <Button
                  variant={me?.isReady ? 'outlined' : 'contained'}
                  color="success"
                  onClick={() => onReadyChange(!me?.isReady)}
                  sx={{ ml: { sm: 'auto' } }}
                >
                  {me?.isReady ? "I'm not ready" : "I'm ready"}
                </Button>
              )}
            </Stack>
          </Stack>
          {needsSound && !soundOn && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1.5, display: 'block' }}>
              {hostMode
                ? 'Turn on sound here so the song plays on this shared screen the moment the game starts.'
                : 'Turn on sound here so track previews play the moment the game starts.'}
            </Typography>
          )}
          {hostMode && !isHost && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1.5, display: 'block' }}>
              No need to turn on sound — the music plays on the host&apos;s screen.
            </Typography>
          )}
        </CardContent>
      </Card>

      <PlaylistPickerDialog
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={imports.importFromCatalog}
        disabled={importing}
      />
    </>
  );
}
