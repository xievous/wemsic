import {
  Alert,
  Button,
  CircularProgress,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { joinRoom } from '../api/client';
import { Layout } from '../components/Layout';
import { saveSession } from '../hooks/useSession';

export function JoinRoom() {
  const { code: paramCode } = useParams();
  const navigate = useNavigate();
  const [code, setCode] = useState(paramCode?.toUpperCase() ?? '');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleJoin() {
    const roomCode = code.trim().toUpperCase();
    const displayName = name.trim();
    if (!roomCode || roomCode.length !== 6) {
      setError('Enter a valid 6-character room code');
      return;
    }
    if (!displayName) {
      setError('Enter your name');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { playerId } = await joinRoom(roomCode, displayName);
      saveSession({ roomCode, playerId, displayName });
      navigate(`/lobby/${roomCode}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to join');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Layout>
      <Typography variant="h4" gutterBottom>
        Join a game
      </Typography>
      <Stack spacing={2} maxWidth={360}>
        <TextField
          label="Room code"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          inputProps={{ maxLength: 6 }}
          fullWidth
        />
        <TextField
          label="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          fullWidth
          inputProps={{ maxLength: 24 }}
        />
        {error && <Alert severity="error">{error}</Alert>}
        <Button
          variant="contained"
          size="large"
          onClick={handleJoin}
          disabled={loading}
        >
          {loading ? <CircularProgress size={24} color="inherit" /> : 'Join'}
        </Button>
      </Stack>
    </Layout>
  );
}
