import { MIN_PLAYLIST_TRACKS } from '@wemsic/shared';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  List,
  ListItemButton,
  ListItemText,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  fetchSpotifyPlaylists,
  importPlaylist,
  spotifyLoginUrl,
} from '../api/client';
import { Layout } from '../components/Layout';
import { loadSession, type Session } from '../hooks/useSession';
import { useSocket } from '../socket/SocketContext';
import { reconnect } from '../api/client';

export function Lobby() {
  const { code } = useParams<{ code: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const {
    lobby,
    joinRoom,
    setReady,
    updateSettings,
    startGame,
    connected,
    error: socketError,
  } = useSocket();

  const [session, setSession] = useState<Session | null>(null);
  const [playlistDialog, setPlaylistDialog] = useState(false);
  const [playlists, setPlaylists] = useState<
    Array<{ id: string; name: string; trackCount: number; imageUrl: string | null }>
  >([]);
  const [loadingPlaylists, setLoadingPlaylists] = useState(false);
  const [importing, setImporting] = useState(false);
  const [playlistUrl, setPlaylistUrl] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const s = loadSession();
    if (!s || s.roomCode !== code?.toUpperCase()) {
      if (code) navigate(`/join/${code}`);
      return;
    }
    setSession(s);

    const spotify = searchParams.get('spotify');
    const pid = searchParams.get('playerId');
    if (spotify === 'connected' && pid === s.playerId) {
      setMessage('Spotify connected');
    } else if (spotify === 'error') {
      setMessage('Spotify connection failed');
    }

    reconnect(s.roomCode, s.playerId).then((state) => {
      if (!('error' in state)) {
        /* lobby will sync via socket */
      }
    });

    if (connected) joinRoom(s.roomCode, s.playerId);
  }, [code, connected, joinRoom, navigate, searchParams]);

  useEffect(() => {
    if (lobby?.phase === 'playing') {
      navigate(`/game/${code}`);
    }
    if (lobby?.phase === 'finished') {
      navigate(`/results/${code}`);
    }
  }, [lobby?.phase, code, navigate]);

  if (!session || !code) return null;

  if (!lobby) {
    return (
      <Layout>
        <Typography color="text.secondary">Loading lobby...</Typography>
      </Layout>
    );
  }

  const me = lobby.players.find((p) => p.id === session.playerId);
  const isHost = me?.isHost ?? false;

  async function openPlaylistPicker() {
    setPlaylistDialog(true);
    setLoadingPlaylists(true);
    try {
      const res = await fetchSpotifyPlaylists(session!.playerId);
      if (res.playlists) setPlaylists(res.playlists);
      else setMessage(res.error ?? 'Could not load playlists');
    } finally {
      setLoadingPlaylists(false);
    }
  }

  async function handleImportPlaylist(playlistId: string) {
    setImporting(true);
    try {
      const res = await importPlaylist(code!, session!.playerId, playlistId);
      setMessage(`Imported ${res.trackCount} tracks from ${res.playlistName}`);
      setPlaylistDialog(false);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Import failed');
    } finally {
      setImporting(false);
    }
  }

  async function handleImportFromUrl() {
    if (!playlistUrl.trim()) return;
    await handleImportPlaylist(playlistUrl.trim());
    setPlaylistUrl('');
  }

  const canReady = (me?.trackCount ?? 0) >= MIN_PLAYLIST_TRACKS;

  return (
    <Layout maxWidth="md">
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="overline" color="text.secondary">
            Room code
          </Typography>
          <Typography variant="h3" letterSpacing="0.2em">
            {code}
          </Typography>
        </Box>
        <Chip
          label={connected ? 'Connected' : 'Connecting...'}
          color={connected ? 'success' : 'default'}
          size="small"
          variant="outlined"
        />
      </Stack>

      {(message || socketError) && (
        <Alert
          severity={socketError ? 'error' : 'info'}
          sx={{ mb: 2 }}
          onClose={() => {
            setMessage(null);
          }}
        >
          {socketError ?? message}
        </Alert>
      )}

      {isHost && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Game settings
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <FormControl fullWidth size="small" sx={{ flex: 1 }}>
                <InputLabel>Mode</InputLabel>
                <Select
                  label="Mode"
                  value={lobby.settings.gameMode}
                  onChange={(e) =>
                    updateSettings({
                      gameMode: e.target.value as 'speed_choice' | 'typing',
                    })
                  }
                >
                  <MenuItem value="speed_choice">Speed choice</MenuItem>
                  <MenuItem value="typing">Typing</MenuItem>
                </Select>
              </FormControl>
              <TextField
                label="Rounds"
                type="number"
                size="small"
                sx={{ flex: 1 }}
                value={lobby.settings.roundCount}
                onChange={(e) =>
                  updateSettings({ roundCount: Number(e.target.value) })
                }
                inputProps={{ min: 5, max: 30 }}
              />
              <TextField
                label="Seconds per round"
                type="number"
                size="small"
                sx={{ flex: 1 }}
                value={lobby.settings.roundDurationSeconds}
                onChange={(e) =>
                  updateSettings({
                    roundDurationSeconds: Number(e.target.value),
                  })
                }
                inputProps={{ min: 10, max: 60 }}
              />
            </Stack>
          </CardContent>
        </Card>
      )}

      <Typography variant="h6" gutterBottom>
        Players
      </Typography>
      <Stack spacing={2} sx={{ mb: 3 }}>
        {lobby.players.map((p) => (
          <Card key={p.id}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between">
                <Typography fontWeight={600}>
                  {p.displayName}
                  {p.isHost && (
                    <Chip label="Host" size="small" sx={{ ml: 1 }} />
                  )}
                </Typography>
                {p.isReady && <CheckCircleIcon color="secondary" />}
              </Stack>
              <Typography variant="body2" color="text.secondary">
                {p.spotifyConnected ? 'Spotify connected' : 'Not connected'}
                {p.playlistName && ` · ${p.playlistName}`}
                {p.trackCount > 0 && ` · ${p.trackCount} tracks`}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </Stack>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Your playlist
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Connect Spotify and add a playlist you own (min {MIN_PLAYLIST_TRACKS}{' '}
            tracks).
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <Button
              variant="outlined"
              href={spotifyLoginUrl(session.playerId, code)}
            >
              Connect Spotify
            </Button>
            <Button
              variant="contained"
              onClick={openPlaylistPicker}
              disabled={!me?.spotifyConnected}
            >
              Choose playlist
            </Button>
            <Button
              variant={me?.isReady ? 'outlined' : 'contained'}
              color="secondary"
              disabled={!canReady}
              onClick={() => setReady(!me?.isReady)}
            >
              {me?.isReady ? 'Not ready' : 'Ready'}
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {isHost && (
        <Button
          variant="contained"
          size="large"
          fullWidth
          disabled={!lobby.canStart}
          onClick={startGame}
        >
          Start game
        </Button>
      )}

      <Dialog open={playlistDialog} onClose={() => setPlaylistDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Select playlist</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Stack direction="row" spacing={1}>
              <TextField
                label="Playlist URL or ID"
                fullWidth
                size="small"
                value={playlistUrl}
                onChange={(e) => setPlaylistUrl(e.target.value)}
              />
              <Button onClick={handleImportFromUrl} disabled={importing}>
                Import
              </Button>
            </Stack>
            {loadingPlaylists ? (
              <CircularProgress />
            ) : (
              <List>
                {playlists.map((pl) => (
                  <ListItemButton
                    key={pl.id}
                    onClick={() => handleImportPlaylist(pl.id)}
                    disabled={importing}
                  >
                    <ListItemText
                      primary={pl.name}
                      secondary={`${pl.trackCount} tracks`}
                    />
                  </ListItemButton>
                ))}
              </List>
            )}
          </Stack>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
