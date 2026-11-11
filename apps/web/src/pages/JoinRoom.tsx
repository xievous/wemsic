import { Alert, Button, CircularProgress } from '@mui/material';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { joinRoom } from '../api/client';
import { AvatarMaker } from '../components/avatar/AvatarMaker';
import { BIG_BUTTON_SX, BigField, FormCard, MakerAndFields } from '../components/FormCard';
import { Layout } from '../components/Layout';
import { loadSavedLook, loadSavedName, saveLook, saveSession } from '../hooks/useSession';
import { useSocket } from '../socket/SocketContext';

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
      <FormCard title="Join a game">
        <MakerAndFields maker={<AvatarMaker value={look} onChange={setLook} />}>
          <BigField
            id="join-code"
            label="Room code"
            code
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
          <Button variant="contained" size="large" onClick={handleJoin} disabled={loading} fullWidth sx={BIG_BUTTON_SX}>
            {loading ? <CircularProgress size={30} color="inherit" /> : 'Join game'}
          </Button>
        </MakerAndFields>
      </FormCard>
    </Layout>
  );
}
