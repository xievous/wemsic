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
import { useNavigate, useParams } from 'react-router-dom';
import { joinRoom } from '../api/client';
import { Layout } from '../components/Layout';
import { saveSession } from '../hooks/useSession';
import { useSocket } from '../socket/SocketContext';

export function JoinRoom() {
  const { code: paramCode } = useParams();
  const navigate = useNavigate();
  const { resetRoomState } = useSocket();
  const [code, setCode] = useState(paramCode?.toUpperCase() ?? '');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    resetRoomState();
  }, [resetRoomState]);

  async function handleJoin() {
    const roomCode = code.trim().toUpperCase();
    const displayName = name.trim();
    if (!roomCode || roomCode.length !== 6) {
      setError('Room codes are 6 characters');
      return;
    }
    if (!displayName) {
      setError('Enter your name to keep going');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { playerId } = await joinRoom(roomCode, displayName);
      resetRoomState();
      saveSession({ roomCode, playerId, displayName });
      navigate(`/lobby/${roomCode}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not join that room. Check the code.');
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
        <Typography variant="overline" color="primary.main">
          Got a code?
        </Typography>
        <Typography variant="h3" gutterBottom>
          Jump into a game
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 3.5 }}>
          Drop the 6-character code your host shared and pick a name.
        </Typography>
        <Stack spacing={2}>
          <TextField
            label="Room code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            inputProps={{
              maxLength: 6,
              style: {
                textTransform: 'uppercase',
                letterSpacing: '0.4em',
                fontWeight: 700,
                fontSize: '1.4rem',
              },
            }}
            fullWidth
          />
          <TextField
            label="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
            fullWidth
            inputProps={{ maxLength: 24 }}
          />
          {error && <Alert severity="error">{error}</Alert>}
          <Button
            variant="contained"
            size="large"
            onClick={handleJoin}
            disabled={loading}
            fullWidth
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : 'Join game'}
          </Button>
        </Stack>
      </Box>
    </Layout>
  );
}
