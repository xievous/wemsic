import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  Popover,
  Slider,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { keyframes } from '@mui/system';
import ChangeHistoryRoundedIcon from '@mui/icons-material/ChangeHistoryRounded';
import CircleRoundedIcon from '@mui/icons-material/CircleRounded';
import SquareRoundedIcon from '@mui/icons-material/SquareRounded';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import HexagonRoundedIcon from '@mui/icons-material/HexagonRounded';
import FavoriteRoundedIcon from '@mui/icons-material/FavoriteRounded';
import VolumeUpRoundedIcon from '@mui/icons-material/VolumeUpRounded';
import VolumeDownRoundedIcon from '@mui/icons-material/VolumeDownRounded';
import VolumeOffRoundedIcon from '@mui/icons-material/VolumeOffRounded';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAudio } from '../audio/AudioProvider';
import { Layout } from '../components/Layout';
import { PlayerAvatar } from '../components/PlayerAvatar';
import { RoundPlayers } from '../components/RoundPlayers';
import { useSession } from '../hooks/useSession';
import { useSocket } from '../socket/SocketContext';
import { TILE_COLORS } from '../theme';

const shake = keyframes`
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-8px); }
  40% { transform: translateX(8px); }
  60% { transform: translateX(-6px); }
  80% { transform: translateX(6px); }
`;

const bounce = keyframes`
  0%, 100% { transform: scaleY(0.3); }
  50% { transform: scaleY(1); }
`;

const popIn = keyframes`
  0% { transform: scale(0.8); opacity: 0; }
  60% { transform: scale(1.05); }
  100% { transform: scale(1); opacity: 1; }
`;

const TILE_SHAPES = [
  ChangeHistoryRoundedIcon,
  CircleRoundedIcon,
  SquareRoundedIcon,
  StarRoundedIcon,
  HexagonRoundedIcon,
  FavoriteRoundedIcon,
];

function Equalizer({ playing }: { playing: boolean }) {
  return (
    <Stack direction="row" spacing={0.6} alignItems="flex-end" sx={{ height: 40 }} aria-hidden>
      {[0, 0.15, 0.3, 0.45, 0.2, 0.35].map((d, i) => (
        <Box
          key={i}
          sx={{
            width: 6,
            height: 40,
            borderRadius: 999,
            transformOrigin: 'bottom',
            background: 'rgba(255,255,255,0.9)',
            animation: playing ? `${bounce} 0.9s ease-in-out infinite` : 'none',
            animationDelay: `${d}s`,
            transform: playing ? undefined : 'scaleY(0.4)',
            '@media (prefers-reduced-motion: reduce)': { animation: 'none', transform: 'scaleY(0.5)' },
          }}
        />
      ))}
    </Stack>
  );
}

function VolumeControl({
  volume,
  onChange,
}: {
  volume: number;
  onChange: (value: number) => void;
}) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const muted = volume === 0;
  const VolumeIcon = muted
    ? VolumeOffRoundedIcon
    : volume < 0.5
      ? VolumeDownRoundedIcon
      : VolumeUpRoundedIcon;

  return (
    <>
      <IconButton
        aria-label="Adjust volume"
        onClick={(e) => setAnchorEl(e.currentTarget)}
        sx={{ color: '#fff', p: 0.5 }}
      >
        <VolumeIcon />
      </IconButton>
      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        transformOrigin={{ vertical: 'top', horizontal: 'center' }}
        slotProps={{ paper: { sx: { borderRadius: '16px', overflow: 'visible' } } }}
      >
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          sx={{ px: 1.5, py: 1, width: 180 }}
        >
          <Slider
            aria-label="Volume"
            size="small"
            value={Math.round(volume * 100)}
            onChange={(_, v) => onChange((Array.isArray(v) ? v[0] : v) / 100)}
            min={0}
            max={100}
          />
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ width: 34, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}
          >
            {Math.round(volume * 100)}%
          </Typography>
        </Stack>
      </Popover>
    </>
  );
}

function Stage({
  roundIndex,
  totalRounds,
  timeLeft,
  progress,
  volume,
  onVolumeChange,
}: {
  roundIndex: number;
  totalRounds: number;
  timeLeft: number;
  progress: number;
  volume: number;
  onVolumeChange: (value: number) => void;
}) {
  const seconds = (timeLeft / 1000).toFixed(1);
  const low = timeLeft <= 5000;
  return (
    <Box
      sx={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: '28px',
        p: { xs: 2.5, sm: 3.5 },
        color: '#fff',
        background: 'linear-gradient(135deg, #0E1A3C 0%, #1A2A6B 55%, #2A3F9E 100%)',
        boxShadow: '0 30px 60px -30px rgba(14,26,60,0.75)',
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
        <Box>
          <Typography variant="overline" sx={{ opacity: 0.7 }}>
            Round {roundIndex + 1} of {totalRounds}
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5, ml: -0.5 }}>
            <VolumeControl volume={volume} onChange={onVolumeChange} />
            <Typography variant="h5" sx={{ color: '#fff' }}>
              Now playing
            </Typography>
          </Stack>
        </Box>
        <Box sx={{ textAlign: 'right' }}>
          <Typography
            sx={{
              fontFamily: '"Fredoka", sans-serif',
              fontWeight: 700,
              lineHeight: 1,
              fontSize: { xs: '2.6rem', sm: '3.2rem' },
              color: low ? '#FFB020' : '#fff',
              transition: 'color 200ms ease',
            }}
          >
            {seconds}
          </Typography>
          <Typography variant="caption" sx={{ opacity: 0.7 }}>
            seconds left
          </Typography>
        </Box>
      </Stack>

      <Box sx={{ mt: 2.5, mb: 1.5 }}>
        <Equalizer playing={!low || timeLeft > 0} />
      </Box>

      <Box
        sx={{
          height: 10,
          borderRadius: 999,
          bgcolor: 'rgba(255,255,255,0.18)',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            height: '100%',
            width: `${progress}%`,
            borderRadius: 999,
            background: low
              ? 'linear-gradient(90deg, #FF7849, #FFB020)'
              : 'linear-gradient(90deg, #16C79A, #2DB7FF)',
            transition: 'width 100ms linear',
          }}
        />
      </Box>
    </Box>
  );
}

export function Game() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const {
    round,
    roundProgress,
    reveal,
    submitMcqAnswer,
    submitTypingGuess,
    lastTypingResult,
    lobby,
    joinRoom,
    connected,
    gameEnd,
  } = useSocket();

  const { enabled: audioEnabled, playPreview, stop, volume, setVolume } = useAudio();
  const lastAudioKeyRef = useRef<string | null>(null);
  const [mcqAnswered, setMcqAnswered] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [guess, setGuess] = useState('');
  const [shaking, setShaking] = useState(false);
  const lastResultTs = useRef(0);

  const session = useSession();
  const joinedRef = useRef(false);

  const roundEndsAt = roundProgress?.roundEndsAt ?? round?.roundEndsAt ?? 0;
  const roundDurationMs =
    roundProgress?.roundDurationMs ?? round?.roundDurationMs ?? 1;
  const playerStatuses = roundProgress?.players ?? round?.players ?? [];
  const previewUrl = round?.previewUrl;
  const roundIndex = round?.roundIndex;

  const isTyping = round?.gameMode === 'typing';
  const timerExpired = timeLeft <= 0 && roundEndsAt > 0;

  useEffect(() => {
    if (!session || session.roomCode !== code?.toUpperCase()) {
      navigate('/');
      return;
    }
    if (!connected || joinedRef.current) return;
    joinedRef.current = true;
    joinRoom(session.roomCode, session.playerId);
  }, [code, connected, joinRoom, navigate, session]);

  useEffect(() => {
    joinedRef.current = false;
  }, [code]);

  useEffect(() => {
    const roomCode = code?.toUpperCase();
    if (gameEnd && session?.roomCode === roomCode) {
      navigate(`/results/${code}`);
    }
    if (lobby && lobby.roomCode === roomCode && lobby.phase === 'lobby') {
      navigate(`/lobby/${code}`);
    }
  }, [gameEnd, lobby, code, navigate, session?.roomCode]);

  useEffect(() => {
    setMcqAnswered(false);
    setSelectedOption(null);
    setGuess('');
    setShaking(false);
  }, [roundIndex]);

  useEffect(() => {
    if (!roundEndsAt) return;
    const tick = () => setTimeLeft(Math.max(0, roundEndsAt - Date.now()));
    tick();
    const id = setInterval(tick, 100);
    return () => clearInterval(id);
  }, [roundEndsAt]);

  useEffect(() => {
    if (!audioEnabled || previewUrl === undefined || roundIndex === undefined) {
      return;
    }
    const key = `${roundIndex}:${previewUrl}`;
    if (lastAudioKeyRef.current === key) return;
    lastAudioKeyRef.current = key;
    playPreview(previewUrl);
  }, [audioEnabled, previewUrl, roundIndex, playPreview]);

  // Pause the preview once the round resolves (reveal) or there is no active
  // round. We intentionally do NOT pause on timerExpired: `timeLeft` starts at
  // 0, so the first render of a new round would momentarily look "expired" and
  // immediately silence the song that just started playing.
  useEffect(() => {
    if (reveal || !round) stop();
  }, [reveal, round, stop]);

  // Stop playback when leaving the game screen.
  useEffect(() => () => stop(), [stop]);

  useEffect(() => {
    if (!lastTypingResult?.incorrect) return;
    const ts = Date.now();
    if (ts - lastResultTs.current < 50) return;
    lastResultTs.current = ts;
    setShaking(true);
    const id = setTimeout(() => setShaking(false), 450);
    return () => clearTimeout(id);
  }, [lastTypingResult]);

  function handleMcq(optionId: string) {
    if (mcqAnswered) return;
    setMcqAnswered(true);
    setSelectedOption(optionId);
    submitMcqAnswer(optionId);
  }

  function handleTypingSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (timerExpired || !guess.trim()) return;
    submitTypingGuess(guess.trim());
    setGuess('');
  }

  if (!session) return null;

  const progress =
    roundEndsAt > 0 ? Math.min(100, (timeLeft / roundDurationMs) * 100) : 0;

  const myStatus = playerStatuses.find((p) => p.playerId === session.playerId);

  let body: ReactNode;

  if (reveal) {
    const myScore = reveal.roundScores[session.playerId] ?? 0;
    const scored = myScore > 0;
    body = (
      <Stack spacing={2.5}>
        <Box
          sx={{
            position: 'relative',
            overflow: 'hidden',
            borderRadius: '28px',
            p: { xs: 2.5, sm: 3.5 },
            color: '#fff',
            background: 'linear-gradient(135deg, #0E1A3C 0%, #1A2A6B 60%, #2A3F9E 100%)',
            boxShadow: '0 30px 60px -30px rgba(14,26,60,0.75)',
          }}
        >
          <Stack direction="row" spacing={2.5} alignItems="center">
            {reveal.albumArtUrl ? (
              <Box
                component="img"
                src={reveal.albumArtUrl}
                alt={`${reveal.correctTitle} album art`}
                sx={{
                  width: { xs: 96, sm: 130 },
                  height: { xs: 96, sm: 130 },
                  borderRadius: '20px',
                  flexShrink: 0,
                  boxShadow: '0 16px 36px -12px rgba(0,0,0,0.6)',
                  animation: `${popIn} 0.5s cubic-bezier(0.16,1,0.3,1)`,
                }}
              />
            ) : (
              <Box
                sx={{
                  width: { xs: 96, sm: 130 },
                  height: { xs: 96, sm: 130 },
                  borderRadius: '20px',
                  flexShrink: 0,
                  display: 'grid',
                  placeItems: 'center',
                  bgcolor: 'rgba(255,255,255,0.12)',
                }}
              >
                <VolumeUpRoundedIcon sx={{ fontSize: 44 }} />
              </Box>
            )}
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="overline" sx={{ opacity: 0.7 }}>
                The track was
              </Typography>
              <Typography variant="h4" sx={{ color: '#fff', lineHeight: 1.1 }}>
                {reveal.correctTitle}
              </Typography>
              <Typography sx={{ opacity: 0.85, mt: 0.5, fontSize: '1.05rem' }}>
                {reveal.correctArtists.join(', ')}
              </Typography>
            </Box>
          </Stack>
          <Box
            sx={{
              mt: 2.5,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 1,
              px: 2,
              py: 1,
              borderRadius: 999,
              bgcolor: scored ? 'rgba(22,199,154,0.25)' : 'rgba(255,255,255,0.1)',
              animation: `${popIn} 0.5s cubic-bezier(0.16,1,0.3,1) 0.15s both`,
            }}
          >
            <Typography variant="h6" sx={{ color: scored ? '#7CF0CE' : '#fff' }}>
              {scored ? `+${myScore} points` : 'No points this round'}
            </Typography>
          </Box>
        </Box>

        <Box
          sx={{
            bgcolor: 'background.paper',
            border: '1px solid rgba(20,33,63,0.06)',
            borderRadius: '24px',
            p: { xs: 2, sm: 2.5 },
          }}
        >
          <Typography variant="overline" color="text.secondary">
            Leaderboard
          </Typography>
          <Stack spacing={1} sx={{ mt: 1 }}>
            {reveal.leaderboard.map((e, i) => {
              const isMe = e.playerId === session.playerId;
              return (
                <Stack
                  key={e.playerId}
                  direction="row"
                  spacing={1.5}
                  alignItems="center"
                  sx={{
                    p: 1,
                    borderRadius: '16px',
                    bgcolor: isMe ? 'rgba(58,107,255,0.08)' : 'transparent',
                  }}
                >
                  <Typography
                    sx={{
                      width: 26,
                      textAlign: 'center',
                      fontWeight: 700,
                      color: i === 0 ? 'warning.main' : 'text.secondary',
                      fontFamily: '"Fredoka", sans-serif',
                    }}
                  >
                    {i + 1}
                  </Typography>
                  <PlayerAvatar id={e.playerId} name={e.displayName} size={34} />
                  <Typography fontWeight={700} sx={{ flex: 1 }} noWrap>
                    {e.displayName}
                    {isMe && <Box component="span" sx={{ color: 'primary.main' }}> · you</Box>}
                  </Typography>
                  <Typography fontWeight={700} sx={{ fontVariantNumeric: 'tabular-nums' }}>
                    {e.score}
                  </Typography>
                </Stack>
              );
            })}
          </Stack>
        </Box>
      </Stack>
    );
  } else if (!round) {
    body = (
      <Stack alignItems="center" spacing={2} sx={{ py: 10 }}>
        <CircularProgress />
        <Typography color="text.secondary">Cueing up the next track...</Typography>
      </Stack>
    );
  } else {
    body = (
      <Stack spacing={2.5} direction={{ xs: 'column', md: 'row' }} alignItems="flex-start">
        <Box sx={{ flex: 1, minWidth: 0, width: '100%' }}>
          <Stack spacing={2.5}>
            <Stage
              roundIndex={round.roundIndex}
              totalRounds={round.totalRounds}
              timeLeft={timeLeft}
              progress={progress}
              volume={volume}
              onVolumeChange={setVolume}
            />

            {!audioEnabled && (
              <Alert severity="warning">
                Enable sound in the lobby so track previews play automatically.
              </Alert>
            )}

            {mcqAnswered && !isTyping && (
              <Alert severity="success">Answer locked in. Hold tight.</Alert>
            )}

            {isTyping && myStatus?.bothCorrect && (
              <Alert severity="success">
                Artist and song, both correct. Waiting on the rest.
              </Alert>
            )}

            {round.gameMode === 'speed_choice' && round.options && (
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                  gap: 1.5,
                }}
              >
                {round.options.map((opt, i) => {
                  const c = TILE_COLORS[i % TILE_COLORS.length];
                  const Shape = TILE_SHAPES[i % TILE_SHAPES.length];
                  const isSelected = selectedOption === opt.id;
                  const dimmed = mcqAnswered && !isSelected;
                  return (
                    <Box
                      key={opt.id}
                      role="button"
                      tabIndex={mcqAnswered ? -1 : 0}
                      onClick={() => handleMcq(opt.id)}
                      onKeyDown={(e) =>
                        (e.key === 'Enter' || e.key === ' ') && handleMcq(opt.id)
                      }
                      sx={{
                        position: 'relative',
                        cursor: mcqAnswered ? 'default' : 'pointer',
                        borderRadius: '18px',
                        px: 2.5,
                        py: { xs: 2.25, sm: 2.75 },
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.75,
                        color: c.text,
                        background: c.bg,
                        boxShadow: dimmed ? 'none' : `0 6px 0 ${c.shadow}`,
                        opacity: dimmed ? 0.45 : 1,
                        transform: isSelected ? 'translateY(2px)' : 'none',
                        transition: 'transform 120ms ease, opacity 160ms ease, box-shadow 120ms ease',
                        outline: isSelected ? '3px solid rgba(255,255,255,0.9)' : 'none',
                        outlineOffset: isSelected ? '-3px' : 0,
                        '&:hover': mcqAnswered
                          ? undefined
                          : { transform: 'translateY(-2px)', boxShadow: `0 9px 0 ${c.shadow}` },
                        '&:active': mcqAnswered ? undefined : { transform: 'translateY(4px)', boxShadow: `0 2px 0 ${c.shadow}` },
                      }}
                    >
                      <Shape sx={{ fontSize: 26, flexShrink: 0, opacity: 0.95 }} />
                      <Typography fontWeight={700} sx={{ fontSize: '1.05rem', lineHeight: 1.2 }}>
                        {opt.label}
                      </Typography>
                    </Box>
                  );
                })}
              </Box>
            )}

            {isTyping && (
              <Box
                component="form"
                onSubmit={handleTypingSubmit}
                sx={{ animation: shaking ? `${shake} 0.45s ease` : 'none' }}
              >
                <Stack spacing={1.5}>
                  <TextField
                    label="Your guess"
                    placeholder="Artist, song, or both"
                    value={guess}
                    onChange={(e) => setGuess(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleTypingSubmit();
                      }
                    }}
                    fullWidth
                    autoFocus
                    disabled={timerExpired}
                    multiline
                    minRows={1}
                    maxRows={3}
                    helperText={
                      timerExpired
                        ? 'Time is up'
                        : 'Press Enter to send. Keep guessing until the clock runs out.'
                    }
                  />
                  <Button
                    type="submit"
                    variant="contained"
                    size="large"
                    disabled={timerExpired || !guess.trim()}
                    sx={{ alignSelf: 'flex-end' }}
                  >
                    Submit guess
                  </Button>
                </Stack>
              </Box>
            )}
          </Stack>
        </Box>

        <Box sx={{ width: { xs: '100%', md: 280 }, flexShrink: 0 }}>
          <RoundPlayers
            players={playerStatuses}
            currentPlayerId={session.playerId}
            gameMode={round.gameMode}
          />
        </Box>
      </Stack>
    );
  }

  return <Layout maxWidth="md">{body}</Layout>;
}
