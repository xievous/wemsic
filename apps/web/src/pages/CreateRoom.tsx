import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import CastForEducationRoundedIcon from '@mui/icons-material/CastForEducationRounded';
import PhoneIphoneRoundedIcon from '@mui/icons-material/PhoneIphoneRounded';
import { useEffect, useState } from 'react';
import type { RoomType } from '@wemsic/shared';
import { useNavigate } from 'react-router-dom';
import { createRoomWithHost } from '../api/client';
import { Layout } from '../components/Layout';
import { saveSession } from '../hooks/useSession';
import { useSocket } from '../socket/SocketContext';

function RoomTypeTile({
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
        p: 2.25,
        border: '2px solid',
        borderColor: active ? 'primary.main' : 'rgba(20,33,63,0.1)',
        bgcolor: active ? 'rgba(58,107,255,0.08)' : 'background.paper',
        transition: 'all 160ms ease',
        '&:hover': { borderColor: 'primary.main', transform: 'translateY(-2px)' },
      }}
    >
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.75 }}>
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

export function CreateRoom() {
  const navigate = useNavigate();
  const { resetRoomState } = useSocket();
  const [name, setName] = useState('');
  const [roomType, setRoomType] = useState<RoomType>('online');
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
      const { roomCode, playerId } = await createRoomWithHost(displayName, roomType);
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
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          Pick how you want to play, choose a name, then share the room code so
          your friends can pile in.
        </Typography>
        <Stack spacing={2.5}>
          <Box>
            <Typography variant="overline" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              How are you playing?
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <RoomTypeTile
                active={roomType === 'online'}
                onClick={() => setRoomType('online')}
                icon={<PhoneIphoneRoundedIcon />}
                title="Online"
                desc="Everyone plays on their own device with their own sound."
              />
              <RoomTypeTile
                active={roomType === 'host'}
                onClick={() => setRoomType('host')}
                icon={<CastForEducationRoundedIcon />}
                title="Host screen"
                desc="One shared screen plays the music and shows the question. Phones are just answer pads."
              />
            </Stack>
          </Box>
          <TextField
            label={roomType === 'host' ? 'Your name (the host)' : 'Your name'}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            fullWidth
            autoFocus
            inputProps={{ maxLength: 24 }}
          />
          {roomType === 'host' && (
            <Alert severity="info" icon={<CastForEducationRoundedIcon />}>
              You&apos;ll run the shared screen: it plays the song and shows the
              question and answers. Players join on their phones and just tap
              their answers. You won&apos;t compete for points.
            </Alert>
          )}
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
