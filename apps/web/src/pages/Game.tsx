import {
  Alert,
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
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { RoundPlayers } from '../components/RoundPlayers';
import { loadSession } from '../hooks/useSession';
import { useSocket } from '../socket/SocketContext';

export function Game() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const {
    round,
    roundProgress,
    reveal,
    submitMcqAnswer,
    submitTypingGuess,
    typingLocked,
    lobby,
    joinRoom,
    connected,
    gameEnd,
  } = useSocket();

  const audioRef = useRef<HTMLAudioElement>(null);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [mcqAnswered, setMcqAnswered] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [guess, setGuess] = useState('');
  const typingDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const session = loadSession();

  const roundEndsAt = roundProgress?.roundEndsAt ?? round?.roundEndsAt ?? 0;
  const roundDurationMs =
    roundProgress?.roundDurationMs ?? round?.roundDurationMs ?? 1;
  const playerStatuses = roundProgress?.players ?? round?.players ?? [];

  const isTyping = round?.gameMode === 'typing';
  const answered = isTyping ? typingLocked : mcqAnswered;

  useEffect(() => {
    if (!session || session.roomCode !== code?.toUpperCase()) {
      navigate('/');
      return;
    }
    if (connected) joinRoom(session.roomCode, session.playerId);
  }, [code, connected, joinRoom, navigate, session]);

  useEffect(() => {
    if (gameEnd) navigate(`/results/${code}`);
    if (lobby?.phase === 'lobby') navigate(`/lobby/${code}`);
  }, [gameEnd, lobby?.phase, code, navigate]);

  useEffect(() => {
    setMcqAnswered(false);
    setGuess('');
  }, [round?.roundIndex]);

  useEffect(() => {
    if (!roundEndsAt) return;
    const tick = () => setTimeLeft(Math.max(0, roundEndsAt - Date.now()));
    tick();
    const id = setInterval(tick, 50);
    return () => clearInterval(id);
  }, [roundEndsAt]);

  useEffect(() => {
    if (!round || !audioEnabled || !audioRef.current) return;
    audioRef.current.src = round.previewUrl;
    void audioRef.current.play().catch(() => {});
  }, [round, audioEnabled]);

  useEffect(() => {
    return () => {
      if (typingDebounceRef.current) clearTimeout(typingDebounceRef.current);
    };
  }, []);

  const enableAudio = useCallback(() => {
    setAudioEnabled(true);
    if (round && audioRef.current) {
      audioRef.current.src = round.previewUrl;
      void audioRef.current.play().catch(() => {});
    }
  }, [round]);

  function handleMcq(optionId: string) {
    if (mcqAnswered) return;
    setMcqAnswered(true);
    submitMcqAnswer(optionId);
  }

  function handleGuessChange(value: string) {
    if (typingLocked) return;
    setGuess(value);
    if (typingDebounceRef.current) clearTimeout(typingDebounceRef.current);
    typingDebounceRef.current = setTimeout(() => {
      submitTypingGuess(value);
    }, 180);
  }

  if (!session) return null;

  const progress =
    roundEndsAt > 0 ? Math.min(100, (timeLeft / roundDurationMs) * 100) : 0;

  if (!audioEnabled) {
    return (
      <Layout maxWidth="md">
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <Typography variant="h5" gutterBottom>
              Enable sound
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 3 }}>
              Tap to allow audio playback for quiz previews.
            </Typography>
            <Button variant="contained" size="large" onClick={enableAudio}>
              Enable sound
            </Button>
          </CardContent>
        </Card>
      </Layout>
    );
  }

  if (reveal) {
    const myScore = reveal.roundScores[session.playerId] ?? 0;
    return (
      <Layout maxWidth="md">
        <Card>
          <CardContent>
            {reveal.albumArtUrl && (
              <Box
                component="img"
                src={reveal.albumArtUrl}
                alt=""
                sx={{ width: 120, height: 120, borderRadius: 2, mb: 2 }}
              />
            )}
            <Typography variant="h5">{reveal.correctTitle}</Typography>
            <Typography color="text.secondary" gutterBottom>
              {reveal.correctArtists.join(', ')}
            </Typography>
            <Typography variant="h6" color="secondary" sx={{ mt: 2 }}>
              +{myScore} points
            </Typography>
            <Stack spacing={1} sx={{ mt: 3 }}>
              {reveal.leaderboard.map((e, i) => (
                <Stack
                  key={e.playerId}
                  direction="row"
                  justifyContent="space-between"
                >
                  <Typography>
                    {i + 1}. {e.displayName}
                  </Typography>
                  <Typography fontWeight={600}>{e.score}</Typography>
                </Stack>
              ))}
            </Stack>
          </CardContent>
        </Card>
      </Layout>
    );
  }

  if (!round) {
    return (
      <Layout maxWidth="md">
        <Box textAlign="center" py={8}>
          <CircularProgress />
          <Typography sx={{ mt: 2 }} color="text.secondary">
            Waiting for next round...
          </Typography>
        </Box>
      </Layout>
    );
  }

  return (
    <Layout maxWidth="md">
      <audio ref={audioRef} />
      <Stack spacing={2} direction={{ xs: 'column', md: 'row' }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack spacing={2}>
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
            >
              <Typography variant="overline" color="text.secondary">
                Round {round.roundIndex + 1} / {round.totalRounds}
              </Typography>
              <Typography variant="h6" color="primary">
                {(timeLeft / 1000).toFixed(1)}s
              </Typography>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={progress}
              sx={{ height: 6, borderRadius: 3 }}
            />

            {answered && (
              <Alert severity="success">
                {isTyping
                  ? 'Correct — waiting for others'
                  : 'Answer locked in'}
              </Alert>
            )}

            {round.gameMode === 'speed_choice' && round.options && (
              <Stack spacing={1.5}>
                {round.options.map((opt) => (
                  <Button
                    key={opt.id}
                    variant="outlined"
                    size="large"
                    fullWidth
                    disabled={mcqAnswered}
                    onClick={() => handleMcq(opt.id)}
                    sx={{
                      py: 2,
                      justifyContent: 'flex-start',
                      textAlign: 'left',
                    }}
                  >
                    {opt.label}
                  </Button>
                ))}
              </Stack>
            )}

            {isTyping && (
              <TextField
                label="Artist, song, or both"
                placeholder="Keep typing until you get it right..."
                value={guess}
                onChange={(e) => handleGuessChange(e.target.value)}
                fullWidth
                autoFocus
                disabled={typingLocked}
                helperText={
                  typingLocked
                    ? 'Got it!'
                    : 'Timer speeds up as players finish'
                }
              />
            )}
          </Stack>
        </Box>

        <Box sx={{ width: { xs: '100%', md: 220 }, flexShrink: 0 }}>
          <RoundPlayers
            players={playerStatuses}
            currentPlayerId={session.playerId}
          />
        </Box>
      </Stack>
    </Layout>
  );
}
