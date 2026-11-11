import { Alert, Box, Button, CircularProgress, Stack, TextField, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { joinRoom } from '../api/client';
import { AvatarMaker } from '../components/avatar/AvatarMaker';
import { Layout } from '../components/Layout';
import { loadSavedLook, loadSavedName, saveLook, saveSession } from '../hooks/useSession';
import { useSocket } from '../socket/SocketContext';

/** A big field with its label above it, readable at a glance. */
function BigField({
  id,
  label,
  big = false,
  ...props
}: { id: string; label: string; big?: boolean } & React.ComponentProps<typeof TextField>) {
  return (
    <Box>
      <Typography
        component="label"
        htmlFor={id}
        sx={{ display: 'block', mb: 1, fontWeight: 700, fontSize: '1.15rem', color: 'text.secondary' }}
      >
        {label}
      </Typography>
      <TextField
        id={id}
        fullWidth
        {...props}
        sx={{
          '& .MuiOutlinedInput-root': { borderRadius: '16px' },
          '& .MuiInputBase-input': big
            ? {
                fontFamily: '"Fredoka", sans-serif',
                fontWeight: 700,
                fontSize: { xs: '1.8rem', sm: '2.4rem' },
                letterSpacing: { xs: '0.25em', sm: '0.35em' },
                textAlign: 'center',
                textTransform: 'uppercase',
                py: 1.5,
              }
            : { fontWeight: 600, fontSize: { xs: '1.3rem', sm: '1.6rem' }, py: { xs: 1.5, sm: 2 } },
        }}
      />
    </Box>
  );
}

export function JoinRoom() {
  const { code: paramCode } = useParams();
  const navigate = useNavigate();
  const { resetRoomState } = useSocket();
  const [code, setCode] = useState(paramCode?.toUpperCase() ?? '');
  const [name, setName] = useState(loadSavedName);
  const [look, setLook] = useState(loadSavedLook);
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
      const { playerId } = await joinRoom(roomCode, displayName, look);
      resetRoomState();
      saveLook(look);
      saveSession({ roomCode, playerId, displayName });
      navigate(`/lobby/${roomCode}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not join that room. Check the code.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Layout maxWidth="md">
      <Box
        sx={{
          bgcolor: 'background.paper',
          border: '1px solid rgba(20,33,63,0.06)',
          borderRadius: '24px',
          boxShadow: '0 24px 50px -28px rgba(20,33,63,0.35)',
          p: { xs: 2.5, sm: 4 },
        }}
      >
        <Typography
          component="h1"
          sx={{
            fontFamily: '"Fredoka", sans-serif',
            fontWeight: 700,
            fontSize: { xs: '2.3rem', sm: '3.4rem' },
            letterSpacing: '-0.02em',
            lineHeight: 1,
            mb: { xs: 2.5, sm: 3.5 },
          }}
        >
          Join a game
        </Typography>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'auto minmax(0, 1fr)' },
            gap: { xs: 3, md: 4.5 },
            alignItems: 'center',
          }}
        >
          <AvatarMaker value={look} onChange={setLook} />
          <Stack spacing={2.25} sx={{ minWidth: 0 }}>
            <BigField
              id="join-code"
              label="Room code"
              big
              value={code}
              placeholder="ABC123"
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              inputProps={{ maxLength: 6, autoComplete: 'off', spellCheck: false }}
              // From an invite link the code is already there, so start on the name.
              autoFocus={!paramCode}
            />
            <BigField
              id="join-name"
              label="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
              autoFocus={Boolean(paramCode)}
              inputProps={{ maxLength: 24 }}
            />
            {error && <Alert severity="error">{error}</Alert>}
            <Button
              variant="contained"
              size="large"
              onClick={handleJoin}
              disabled={loading}
              fullWidth
              sx={{ py: { xs: 1.75, sm: 2.25 }, fontSize: { xs: '1.3rem', sm: '1.6rem' }, fontWeight: 700, borderRadius: '18px' }}
            >
              {loading ? <CircularProgress size={30} color="inherit" /> : 'Join game'}
            </Button>
          </Stack>
        </Box>
      </Box>
    </Layout>
  );
}
