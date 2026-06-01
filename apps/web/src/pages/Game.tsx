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
import { loadSession } from '../hooks/useSession';
import { useSocket } from '../socket/SocketContext';

export function Game() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { round, reveal, submitAnswer, lobby, joinRoom, connected, gameEnd } =
    useSocket();

  const audioRef = useRef<HTMLAudioElement>(null);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [answered, setAnswered] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [artist, setArtist] = useState('');
  const [title, setTitle] = useState('');
  const submittedRef = useRef(false);

  const session = loadSession();

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
    setAnswered(false);
    submittedRef.current = false;
    setArtist('');
    setTitle('');
  }, [round?.roundIndex]);

  useEffect(() => {
    if (!round) return;
    const tick = () => {
      setTimeLeft(Math.max(0, round.roundEndsAt - Date.now()));
    };
    tick();
    const id = setInterval(tick, 100);
    return () => clearInterval(id);
  }, [round]);

  useEffect(() => {
    if (!round || !audioEnabled || !audioRef.current) return;
    audioRef.current.src = round.previewUrl;
    void audioRef.current.play().catch(() => {});
  }, [round, audioEnabled]);

  const enableAudio = useCallback(() => {
    setAudioEnabled(true);
    if (round && audioRef.current) {
      audioRef.current.src = round.previewUrl;
      void audioRef.current.play().catch(() => {});
    }
  }, [round]);

  function handleMcq(optionId: string) {
    if (answered || submittedRef.current) return;
    submittedRef.current = true;
    setAnswered(true);
    submitAnswer({ optionId });
  }

  function handleTypingSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (answered || submittedRef.current) return;
    submittedRef.current = true;
    setAnswered(true);
    submitAnswer({ artist, title });
  }

  if (!session) return null;

  const progress = round
    ? Math.min(100, (timeLeft / round.roundDurationMs) * 100)
    : 0;

  if (!audioEnabled) {
    return (
      <Layout>
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
      <Layout>
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
      <Layout>
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
    <Layout>
      <audio ref={audioRef} />
      <Stack spacing={2}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
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
          <Alert severity="success">Answer submitted</Alert>
        )}

        {round.gameMode === 'speed_choice' && round.options && (
          <Stack spacing={1.5}>
            {round.options.map((opt) => (
              <Button
                key={opt.id}
                variant="outlined"
                size="large"
                fullWidth
                disabled={answered}
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

        {round.gameMode === 'typing' && (
          <Box component="form" onSubmit={handleTypingSubmit}>
            <Stack spacing={2}>
              <TextField
                label="Artist"
                value={artist}
                onChange={(e) => setArtist(e.target.value)}
                fullWidth
                autoFocus
                disabled={answered}
              />
              <TextField
                label="Song title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                fullWidth
                disabled={answered}
              />
              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={answered}
              >
                Submit
              </Button>
            </Stack>
          </Box>
        )}
      </Stack>
    </Layout>
  );
}
