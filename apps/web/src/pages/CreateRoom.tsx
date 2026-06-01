import {
  Alert,
  Button,
  CircularProgress,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createRoomWithHost } from '../api/client';
import { Layout } from '../components/Layout';
import { saveSession } from '../hooks/useSession';

export function CreateRoom() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    const displayName = name.trim();
    if (!displayName) {
      setError('Enter your name');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { roomCode, playerId } = await createRoomWithHost(displayName);
      saveSession({ roomCode, playerId, displayName });
      navigate(`/lobby/${roomCode}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create room');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Layout>
      <Typography variant="h4" gutterBottom>
        Create a game
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        You will be the host. Share the room code with friends.
      </Typography>
      <Stack spacing={2} maxWidth={360}>
        <TextField
          label="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          fullWidth
          autoFocus
          inputProps={{ maxLength: 24 }}
        />
        {error && <Alert severity="error">{error}</Alert>}
        <Button
          variant="contained"
          size="large"
          onClick={handleCreate}
          disabled={loading}
        >
          {loading ? <CircularProgress size={24} color="inherit" /> : 'Create room'}
        </Button>
      </Stack>
    </Layout>
  );
}
