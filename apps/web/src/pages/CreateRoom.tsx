import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createRoomWithHost } from '../api/client';
import { Layout } from '../components/Layout';
import { saveSession } from '../hooks/useSession';
import { useSocket } from '../socket/SocketContext';

export function CreateRoom() {
  const navigate = useNavigate();
  const { resetRoomState } = useSocket();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    resetRoomState();
  }, [resetRoomState]);

  async function handleCreate() {
    const displayName = name.trim();
    if (!displayName) {
      setError('Enter your name to keep going');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { roomCode, playerId } = await createRoomWithHost(displayName);
      resetRoomState();
      saveSession({ roomCode, playerId, displayName });
      navigate(`/lobby/${roomCode}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create the room. Try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Layout>
      <Box
        sx={{
          bgcolor: 'background.paper',
          border: '1px solid rgba(20,33,63,0.06)',
          borderRadius: '24px',
          boxShadow: '0 24px 50px -28px rgba(20,33,63,0.35)',
          p: { xs: 3, sm: 4 },
        }}
      >
        <Typography variant="overline" color="secondary.main">
          You&apos;re the host
        </Typography>
        <Typography variant="h3" gutterBottom>
          Set up your game
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 3.5 }}>
          Pick a name, then share the room code so your friends can pile in.
        </Typography>
        <Stack spacing={2}>
          <TextField
            label="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
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
            fullWidth
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : 'Create room'}
          </Button>
        </Stack>
      </Box>
    </Layout>
  );
}
