import { MIN_PLAYLIST_TRACKS } from '@wemsic/shared';
import BoltRoundedIcon from '@mui/icons-material/BoltRounded';
import CastForEducationRoundedIcon from '@mui/icons-material/CastForEducationRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import KeyboardRoundedIcon from '@mui/icons-material/KeyboardRounded';
import LinkRoundedIcon from '@mui/icons-material/LinkRounded';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';
import VolumeUpRoundedIcon from '@mui/icons-material/VolumeUpRounded';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  LinearProgress,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import type { PlaylistImportProgressPayload, TypingSpellingLeniency } from '@wemsic/shared';
import { useNavigate, useParams } from 'react-router-dom';
import QRCode from 'react-qr-code';
import { importMusic } from '../api/client';
import { useAudio } from '../audio/AudioProvider';
import { CopyRoomCodeButton } from '../components/CopyRoomCodeButton';
import { Layout } from '../components/Layout';
import { PlayerAvatar } from '../components/PlayerAvatar';
import { clearSession, loadSession, type Session } from '../hooks/useSession';
import { useSocket } from '../socket/SocketContext';
import { reconnect } from '../api/client';

function ModeTile({
  active,
  onClick,
  icon,
  title,
  desc,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <Box
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onClick()}
      sx={{
        flex: 1,
        cursor: 'pointer',
        borderRadius: '18px',
        p: 2,
        border: '2px solid',
        borderColor: active ? 'primary.main' : 'rgba(20,33,63,0.1)',
        bgcolor: active ? 'rgba(58,107,255,0.08)' : 'background.paper',
        transition: 'all 160ms ease',
        '&:hover': { borderColor: 'primary.main', transform: 'translateY(-2px)' },
      }}
    >
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
        <Box sx={{ color: active ? 'primary.main' : 'text.secondary', display: 'flex' }}>
          {icon}
        </Box>
        <Typography fontWeight={700}>{title}</Typography>
      </Stack>
      <Typography variant="body2" color="text.secondary">
        {desc}
      </Typography>
    </Box>
  );
}

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

function NumberField({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
}) {
  return (
    <TextField
      label={label}
      type="number"
      size="small"
      sx={{ flex: 1 }}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      inputProps={{ min, max }}
    />
  );
}

const SPELLING_LENIENCY_OPTIONS: {
  value: TypingSpellingLeniency;
  title: string;
  desc: string;
  recommended?: boolean;
}[] = [
  {
    value: 'lenient',
    title: 'Lenient',
    desc: 'Forgives typos and missing spaces.',
  },
  {
    value: 'normal',
    title: 'Normal',
    desc: 'Minor typos OK, spaces flexible.',
    recommended: true,
  },
  {
    value: 'hard',
    title: 'Hard',
    desc: 'Exact spelling, spaces, and punctuation.',
  },
];

function AdvancedSettingsSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Box>
      <Typography variant="overline" color="text.secondary" sx={{ display: 'block', mb: 0.75 }}>
        {title}
      </Typography>
      {description && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          {description}
        </Typography>
      )}
      {children}
    </Box>
  );
}

const GUESS_VISIBILITY_OPTIONS = [
  { value: false, title: 'Hidden' },
  { value: true, title: 'Visible' },
] as const;

function GuessVisibilitySegment({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: 0.75,
        p: 0.5,
        borderRadius: '14px',
        bgcolor: 'rgba(20,33,63,0.04)',
        border: '1px solid rgba(20,33,63,0.08)',
      }}
    >
      {GUESS_VISIBILITY_OPTIONS.map((option) => {
        const active = value === option.value;
        return (
          <Box
            key={String(option.value)}
            role="button"
            tabIndex={0}
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') onChange(option.value);
            }}
            sx={{
              cursor: 'pointer',
              borderRadius: '10px',
              py: 1,
              px: 0.75,
              textAlign: 'center',
              bgcolor: active ? 'background.paper' : 'transparent',
              boxShadow: active ? '0 4px 14px -8px rgba(20,33,63,0.35)' : 'none',
              border: '2px solid',
              borderColor: active ? 'primary.main' : 'transparent',
              transition: 'all 160ms ease',
              '&:hover': {
                borderColor: active ? 'primary.main' : 'rgba(58,107,255,0.35)',
              },
            }}
          >
            <Typography
              variant="body2"
              fontWeight={700}
              sx={{ color: active ? 'primary.main' : 'text.primary', lineHeight: 1.2 }}
            >
              {option.title}
            </Typography>
          </Box>
        );
      })}
    </Box>
  );
}

function LeniencySegment({
  value,
  onChange,
}: {
  value: TypingSpellingLeniency;
  onChange: (value: TypingSpellingLeniency) => void;
}) {
  const activeOption =
    SPELLING_LENIENCY_OPTIONS.find((o) => o.value === value) ??
    SPELLING_LENIENCY_OPTIONS[1];

  return (
    <Stack spacing={1.25}>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 0.75,
          p: 0.5,
          borderRadius: '14px',
          bgcolor: 'rgba(20,33,63,0.04)',
          border: '1px solid rgba(20,33,63,0.08)',
        }}
      >
        {SPELLING_LENIENCY_OPTIONS.map((option) => {
          const active = value === option.value;
          return (
            <Box
              key={option.value}
              role="button"
              tabIndex={0}
              aria-pressed={active}
              onClick={() => onChange(option.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') onChange(option.value);
              }}
              sx={{
                cursor: 'pointer',
                borderRadius: '10px',
                py: 1,
                px: 0.75,
                textAlign: 'center',
                bgcolor: active ? 'background.paper' : 'transparent',
                boxShadow: active ? '0 4px 14px -8px rgba(20,33,63,0.35)' : 'none',
                border: '2px solid',
                borderColor: active ? 'primary.main' : 'transparent',
                transition: 'all 160ms ease',
                '&:hover': {
                  borderColor: active ? 'primary.main' : 'rgba(58,107,255,0.35)',
                },
              }}
            >
              <Typography
                variant="body2"
                fontWeight={700}
                sx={{ color: active ? 'primary.main' : 'text.primary', lineHeight: 1.2 }}
              >
                {option.title}
              </Typography>
            </Box>
          );
        })}
      </Box>
      <Typography variant="caption" color="text.secondary" sx={{ px: 0.25, lineHeight: 1.45 }}>
        {activeOption.desc}
        {activeOption.recommended && ' Recommended.'}
      </Typography>
    </Stack>
  );
}

export function Lobby() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const {
    lobby,
    joinRoom,
    setReady,
    updateSettings,
    startGame,
    kickPlayer,
    connected,
    error: socketError,
    playlistImportProgress,
    clearPlaylistImportProgress,
  } = useSocket();
  const { enabled: soundOn, enableAudio } = useAudio();

  const [session, setSession] = useState<Session | null>(null);
  const [importing, setImporting] = useState(false);
  const [playlistUrl, setPlaylistUrl] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [countdownLeft, setCountdownLeft] = useState<number | null>(null);
  const [advancedSettingsOpen, setAdvancedSettingsOpen] = useState(false);
  const joinUrl = useMemo(
    () => (code ? `${window.location.origin}/join/${code.toUpperCase()}` : ''),
    [code],
  );

  useEffect(() => {
    const s = loadSession();
    if (!s || s.roomCode !== code?.toUpperCase()) {
      if (code) navigate(`/join/${code}`);
      return;
    }
    setSession(s);

    reconnect(s.roomCode, s.playerId).then((state) => {
      if (!('error' in state)) {
        /* lobby will sync via socket */
      }
    });

    if (connected) joinRoom(s.roomCode, s.playerId);
  }, [code, connected, joinRoom, navigate]);

  useEffect(() => {
    const roomCode = code?.toUpperCase();
    if (!lobby || lobby.roomCode !== roomCode) return;
    if (lobby.phase === 'playing') {
      navigate(`/game/${code}`);
    }
    if (lobby.phase === 'finished') {
      navigate(`/results/${code}`);
    }
  }, [lobby, code, navigate]);

  useEffect(() => {
    if (!session || !lobby || lobby.roomCode !== code?.toUpperCase()) return;
    if (!lobby.players.some((p) => p.id === session.playerId)) {
      clearSession();
      navigate('/?removed=1');
    }
  }, [lobby, session, code, navigate]);

  useEffect(() => {
    const endsAt = lobby?.startCountdownEndsAt;
    if (!endsAt) {
      setCountdownLeft(null);
      return;
    }
    const tick = () => {
      setCountdownLeft(Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)));
    };
    tick();
    const id = setInterval(tick, 200);
    return () => clearInterval(id);
  }, [lobby?.startCountdownEndsAt]);

  if (!session || !code) return null;

  if (!lobby) {
    return (
      <Layout>
        <Stack alignItems="center" spacing={2} sx={{ py: 10 }}>
          <CircularProgress />
          <Typography color="text.secondary">Opening the lobby...</Typography>
        </Stack>
      </Layout>
    );
  }

  const me = lobby.players.find((p) => p.id === session.playerId);
  const isHost = me?.isHost ?? false;
  const hostMode = lobby.settings.roomType === 'host';
  // In host mode the host runs the shared screen (needs sound, never readies),
  // while players answer on their phones (no sound needed, must ready up).
  const needsSound = !hostMode || isHost;
  const needsReady = !hostMode || !isHost;
  const countdownActive = countdownLeft !== null && countdownLeft > 0;
  const myImportProgress =
    importing &&
    playlistImportProgress?.playerId === session.playerId
      ? playlistImportProgress
      : null;

  async function handleImportFromUrl() {
    if (!playlistUrl.trim()) return;
    setImporting(true);
    clearPlaylistImportProgress();
    try {
      const res = await importMusic(code!, session!.playerId, playlistUrl.trim());
      const truncatedNote = res.truncated
        ? ' (some tracks could not be loaded)'
        : '';
      setMessage(`Added ${res.trackCount} tracks from ${res.playlistName}${truncatedNote}`);
      setPlaylistUrl('');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Import failed');
    } finally {
      setImporting(false);
      clearPlaylistImportProgress();
    }
  }

  const roomHasPlaylist = lobby.players.some(
    (p) => p.trackCount >= MIN_PLAYLIST_TRACKS,
  );

  return (
    <Layout maxWidth="md">
      {hostMode ? (
        <Box
          sx={{
            mb: 3,
            p: { xs: 2.5, sm: 3 },
            borderRadius: '24px',
            color: '#fff',
            background: 'linear-gradient(120deg, #3A6BFF 0%, #6C5CE7 55%, #00BFD8 100%)',
            boxShadow: '0 24px 50px -24px rgba(58,107,255,0.6)',
            overflow: 'hidden',
          }}
        >
          {isHost ? (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                alignItems: 'center',
                gap: { xs: 2.5, sm: 0 },
              }}
            >
              <Stack
                alignItems="center"
                spacing={0.75}
                sx={{
                  textAlign: 'center',
                  pb: { xs: 2.5, sm: 0 },
                  borderBottom: { xs: '1px solid rgba(255,255,255,0.18)', sm: 'none' },
                  borderRight: { sm: '1px solid rgba(255,255,255,0.18)' },
                  pr: { sm: 3 },
                }}
              >
                <Typography variant="overline" sx={{ opacity: 0.85 }}>
                  Room code
                </Typography>
                <Stack direction="row" alignItems="center" spacing={0.25}>
                  <Typography
                    variant="h2"
                    sx={{
                      letterSpacing: '0.18em',
                      fontSize: { xs: '2rem', sm: '2.35rem' },
                      lineHeight: 1,
                    }}
                  >
                    {code}
                  </Typography>
                  <CopyRoomCodeButton code={code} />
                </Stack>
              </Stack>

              <Stack alignItems="center" spacing={1} sx={{ pl: { sm: 3 }, pt: { xs: 0.5, sm: 0 } }}>
                <Box
                  sx={{
                    lineHeight: 0,
                    p: 1,
                    borderRadius: '16px',
                    bgcolor: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.18)',
                    '& svg': {
                      display: 'block',
                      width: { xs: 88, sm: 96 },
                      height: 'auto',
                    },
                  }}
                >
                  <QRCode value={joinUrl} size={96} bgColor="transparent" fgColor="#FFFFFF" />
                </Box>
                <Typography
                  variant="overline"
                  sx={{ opacity: 0.85, fontSize: '0.62rem', letterSpacing: '0.14em' }}
                >
                  Scan to join
                </Typography>
              </Stack>
            </Box>
          ) : (
            <Stack alignItems="center" spacing={0.75} sx={{ textAlign: 'center' }}>
              <Typography variant="overline" sx={{ opacity: 0.85 }}>
                Room code
              </Typography>
              <Stack direction="row" alignItems="center" spacing={0.25}>
                <Typography
                  variant="h2"
                  sx={{
                    letterSpacing: '0.18em',
                    fontSize: { xs: '2rem', sm: '2.35rem' },
                    lineHeight: 1,
                  }}
                >
                  {code}
                </Typography>
                <CopyRoomCodeButton code={code} />
              </Stack>
            </Stack>
          )}
        </Box>
      ) : (
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 2,
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 3,
            p: { xs: 2.5, sm: 3 },
            borderRadius: '24px',
            color: '#fff',
            background: 'linear-gradient(120deg, #3A6BFF 0%, #6C5CE7 55%, #00BFD8 100%)',
            boxShadow: '0 24px 50px -24px rgba(58,107,255,0.6)',
          }}
        >
          <Box>
            <Typography variant="overline" sx={{ opacity: 0.85 }}>
              Room code
            </Typography>
            <Stack direction="row" alignItems="center" spacing={0.25}>
              <Typography
                variant="h2"
                sx={{ letterSpacing: '0.18em', fontSize: { xs: '2.4rem', sm: '3rem' } }}
              >
                {code}
              </Typography>
              <CopyRoomCodeButton code={code} />
            </Stack>
          </Box>
          <Chip
            label={connected ? 'Connected' : 'Connecting...'}
            sx={{
              bgcolor: 'rgba(255,255,255,0.2)',
              color: '#fff',
              fontWeight: 700,
              backdropFilter: 'blur(4px)',
            }}
          />
        </Box>
      )}

      {hostMode && (
        <Alert
          severity="info"
          icon={<CastForEducationRoundedIcon />}
          sx={{
            mb: 2,
            bgcolor: 'rgba(58,107,255,0.08)',
            color: 'text.primary',
            '& .MuiAlert-icon': { color: 'primary.main' },
          }}
        >
          {isHost
            ? 'Host screen mode: this device is the shared screen. Keep it visible to everyone and turn on sound — it plays the music and shows each question and answers.'
            : 'Host screen mode: watch the host\u2019s screen and listen there. Add a playlist if you like, then ready up — you\u2019ll just tap your answers on this phone.'}
        </Alert>
      )}

      {(message || socketError) && (
        <Alert
          severity={socketError ? 'error' : 'info'}
          sx={{ mb: 2 }}
          onClose={() => setMessage(null)}
        >
          {socketError ?? message}
        </Alert>
      )}

      {isHost && (
        <>
          <Card sx={{ mb: 3 }}>
            <CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                sx={{ mb: 2 }}
              >
                <Typography variant="h5">Game settings</Typography>
                <Tooltip title="Advanced settings">
                  <IconButton
                    aria-label="Advanced settings"
                    onClick={() => setAdvancedSettingsOpen(true)}
                    sx={{
                      bgcolor: 'rgba(58,107,255,0.08)',
                      '&:hover': { bgcolor: 'rgba(58,107,255,0.14)' },
                    }}
                  >
                    <SettingsRoundedIcon />
                  </IconButton>
                </Tooltip>
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <ModeTile
                  active={lobby.settings.gameMode === 'speed_choice'}
                  onClick={() => updateSettings({ gameMode: 'speed_choice' })}
                  icon={<BoltRoundedIcon />}
                  title="Speed choice"
                  desc="Tap the right answer fastest"
                />
                <ModeTile
                  active={lobby.settings.gameMode === 'typing'}
                  onClick={() => updateSettings({ gameMode: 'typing' })}
                  icon={<KeyboardRoundedIcon />}
                  title="Typing"
                  desc="Type the artist and the song"
                />
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                {lobby.settings.roundCount} rounds · {lobby.settings.roundDurationSeconds}s per round
                {lobby.settings.gameMode === 'typing' && (
                  <>
                    {' '}
                    ·{' '}
                    {SPELLING_LENIENCY_OPTIONS.find(
                      (o) =>
                        o.value ===
                        (lobby.settings.typingSpellingLeniency ?? 'normal'),
                    )?.title ?? 'Normal'}{' '}
                    spelling
                  </>
                )}
                {' · '}
                {lobby.settings.showOthersGuesses ? 'guesses visible' : 'guesses hidden'}
              </Typography>
            </CardContent>
          </Card>

          <Dialog
            open={advancedSettingsOpen}
            onClose={() => setAdvancedSettingsOpen(false)}
            fullWidth
            maxWidth="sm"
            PaperProps={{ sx: { borderRadius: '20px' } }}
          >
            <DialogTitle sx={{ pb: 1 }}>Advanced settings</DialogTitle>
            <DialogContent sx={{ pt: 1 }}>
              <Stack spacing={2.5} divider={<Divider flexItem sx={{ borderColor: 'rgba(20,33,63,0.08)' }} />}>
                <AdvancedSettingsSection
                  title="Round length"
                  description="How many rounds to play and how long each round lasts."
                >
                  <Stack direction="row" spacing={1.5}>
                    <NumberField
                      label="Rounds"
                      value={lobby.settings.roundCount}
                      onChange={(v) => updateSettings({ roundCount: v })}
                      min={5}
                      max={30}
                    />
                    <NumberField
                      label="Seconds per round"
                      value={lobby.settings.roundDurationSeconds}
                      onChange={(v) => updateSettings({ roundDurationSeconds: v })}
                      min={10}
                      max={60}
                    />
                  </Stack>
                </AdvancedSettingsSection>

                <AdvancedSettingsSection
                  title="Other players' guesses"
                  description={
                    lobby.settings.gameMode === 'speed_choice'
                      ? 'When visible, everyone sees which answer each player picked.'
                      : 'When visible, wrong guesses appear as clues. Correct guesses only show as “Guessed right”.'
                  }
                >
                  <GuessVisibilitySegment
                    value={lobby.settings.showOthersGuesses ?? false}
                    onChange={(showOthersGuesses) => updateSettings({ showOthersGuesses })}
                  />
                </AdvancedSettingsSection>

                {lobby.settings.gameMode === 'typing' && (
                  <AdvancedSettingsSection
                    title="Spelling leniency"
                    description="How strictly typed answers are matched."
                  >
                    <LeniencySegment
                      value={lobby.settings.typingSpellingLeniency ?? 'normal'}
                      onChange={(typingSpellingLeniency) =>
                        updateSettings({ typingSpellingLeniency })
                      }
                    />
                  </AdvancedSettingsSection>
                )}
              </Stack>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2.5 }}>
              <Button onClick={() => setAdvancedSettingsOpen(false)} variant="contained">
                Done
              </Button>
            </DialogActions>
          </Dialog>
        </>
      )}

      <Typography variant="h5" sx={{ mb: 1.5 }}>
        Players
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
          gap: 1.5,
          mb: 3,
        }}
      >
        {lobby.players.map((p) => {
          const ready = p.isReady;
          return (
            <Stack
              key={p.id}
              direction="row"
              spacing={1.5}
              alignItems="center"
              sx={{
                p: 1.75,
                borderRadius: '20px',
                bgcolor: 'background.paper',
                border: '2px solid',
                borderColor: ready ? 'success.main' : 'rgba(20,33,63,0.06)',
                boxShadow: '0 16px 36px -28px rgba(20,33,63,0.4)',
                transition: 'border-color 200ms ease',
              }}
            >
              <PlayerAvatar id={p.id} name={p.displayName} size={44} done={ready} />
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Stack direction="row" spacing={0.75} alignItems="center">
                  <Typography fontWeight={700} noWrap>
                    {p.displayName}
                    {p.id === session.playerId && (
                      <Box component="span" sx={{ color: 'primary.main' }}> · you</Box>
                    )}
                  </Typography>
                  {p.isHost && (
                    <Chip
                      label={hostMode ? 'Host · screen' : 'Host'}
                      size="small"
                      sx={{ height: 20, bgcolor: 'rgba(58,107,255,0.12)', color: 'primary.main', fontWeight: 700 }}
                    />
                  )}
                </Stack>
              </Box>
              {isHost && p.id !== session.playerId && (
                <Tooltip title={`Remove ${p.displayName}`}>
                  <IconButton
                    size="small"
                    aria-label={`Remove ${p.displayName}`}
                    onClick={() => kickPlayer(p.id)}
                    sx={{
                      color: 'text.secondary',
                      '&:hover': { color: 'error.main', bgcolor: 'rgba(255,84,112,0.1)' },
                    }}
                  >
                    <CloseRoundedIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
            </Stack>
          );
        })}
      </Box>

      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
          <Typography variant="h5" gutterBottom>
            Your music
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Paste a public Spotify playlist or album link (at least {MIN_PLAYLIST_TRACKS}{' '}
            tracks). Everyone can add their own — songs are mixed fairly across players
            during the game. Swap yours any time by pasting a new link.
          </Typography>
          <Stack spacing={1.5}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              <TextField
                label="Spotify playlist or album link"
                placeholder="https://open.spotify.com/playlist/…"
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
                  ? myImportProgress?.total
                    ? `${Math.min(myImportProgress.loaded, myImportProgress.total).toLocaleString()}…`
                    : 'Scanning…'
                  : 'Add'}
              </Button>
            </Stack>
            {myImportProgress && <ImportProgressBar progress={myImportProgress} />}
            {me?.playlistName && (
              <Chip
                icon={<CheckCircleRoundedIcon />}
                label={`Your playlist: ${me.playlistName} (${me.trackCount} tracks)`}
                color="success"
                variant="outlined"
                sx={{ alignSelf: 'flex-start' }}
              />
            )}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} flexWrap="wrap" useFlexGap>
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
                  onClick={() => setReady(!me?.isReady)}
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

      {countdownActive && (
        <Alert
          severity="info"
          sx={{
            mb: 2,
            bgcolor: 'rgba(58,107,255,0.08)',
            color: 'text.primary',
            '& .MuiAlert-icon': { color: 'primary.main' },
          }}
        >
          {isHost
            ? `Game starts in ${countdownLeft} second${countdownLeft === 1 ? '' : 's'}. Tap the button again to cancel.`
            : `The host is starting the game in ${countdownLeft}…`}
        </Alert>
      )}

      {isHost && (
        <Button
          variant="contained"
          size="large"
          fullWidth
          color="primary"
          startIcon={countdownActive ? <CloseRoundedIcon /> : <PlayArrowRoundedIcon />}
          disabled={!lobby.canStart && !countdownActive}
          onClick={startGame}
          sx={{ py: 2, fontSize: '1.15rem' }}
        >
          {countdownActive
            ? `Starting in ${countdownLeft}… (tap to cancel)`
            : roomHasPlaylist
              ? 'Start the game'
              : 'Add a playlist to start'}
        </Button>
      )}
    </Layout>
  );
}
