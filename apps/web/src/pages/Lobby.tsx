import { Alert, Box, Button, CircularProgress, Stack, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { reconnect } from '../api/client';
import { Layout } from '../components/Layout';
import { clearSession, loadSession, type Session } from '../hooks/useSession';
import { useSocket } from '../socket/SocketContext';
import { GameSettingsCard, GameSettingsSummary } from './lobby/GameSettingsCard';
import { MusicCard } from './lobby/MusicCard';
import { PlayerList } from './lobby/PlayerList';
import { HostModeNotice, RoomHeader } from './lobby/RoomHeader';
import { StartControls } from './lobby/StartControls';
import { startBlocker } from './lobby/startStatus';
import { usePlaylistImport } from './lobby/usePlaylistImport';

export function Lobby() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const {
    lobby,
    joinRoom,
    leaveRoom,
    setReady,
    updateSettings,
    startGame,
    kickPlayer,
    connected,
    error: socketError,
    clearError,
  } = useSocket();

  const [session, setSession] = useState<Session | null>(null);
  const imports = usePlaylistImport(code ?? '', session?.playerId ?? '');

  useEffect(() => {
    const s = loadSession();
    if (!s || s.roomCode !== code?.toUpperCase()) {
      if (code) navigate(`/join/${code}`);
      return;
    }
    setSession(s);

    reconnect(s.roomCode, s.playerId).then((state) => {
      if (!('error' in state)) {
        /* lobby will sync via socket */
      }
    });

    if (connected) joinRoom(s.roomCode, s.playerId);
  }, [code, connected, joinRoom, navigate]);

  useEffect(() => {
    const roomCode = code?.toUpperCase();
    if (!lobby || lobby.roomCode !== roomCode) return;
    if (lobby.phase === 'playing') {
      navigate(`/game/${code}`);
    }
    if (lobby.phase === 'finished') {
      navigate(`/results/${code}`);
    }
  }, [lobby, code, navigate]);

  useEffect(() => {
    if (!session || !lobby || lobby.roomCode !== code?.toUpperCase()) return;
    if (!lobby.players.some((p) => p.id === session.playerId)) {
      clearSession();
      navigate('/?removed=1');
    }
  }, [lobby, session, code, navigate]);

  if (!session || !code) return null;

  if (!lobby) {
    return (
      <Layout>
        <Stack alignItems="center" spacing={2} sx={{ py: 10 }}>
          <CircularProgress />
          <Typography color="text.secondary">Opening the lobby...</Typography>
        </Stack>
      </Layout>
    );
  }

  const me = lobby.players.find((p) => p.id === session.playerId);
  const isHost = me?.isHost ?? false;
  const hostMode = lobby.settings.roomType === 'host';

  return (
    <Layout maxWidth="md">
      <RoomHeader code={code} hostMode={hostMode} isHost={isHost} connected={connected} />

      {hostMode && <HostModeNotice isHost={isHost} />}

      {(imports.message || socketError) && (
        <Alert
          severity={socketError ? 'error' : 'info'}
          sx={{ mb: 2 }}
          // Close whichever message is showing; the server error takes priority.
          onClose={() => (socketError ? clearError() : imports.setMessage(null))}
        >
          {socketError ?? imports.message}
        </Alert>
      )}

      {isHost ? (
        <GameSettingsCard settings={lobby.settings} onChange={updateSettings} />
      ) : (
        <GameSettingsSummary settings={lobby.settings} />
      )}

      <PlayerList
        players={lobby.players}
        myPlayerId={session.playerId}
        isHost={isHost}
        hostMode={hostMode}
        onKick={kickPlayer}
      />

      <MusicCard
        me={me}
        imports={imports}
        hostMode={hostMode}
        isHost={isHost}
        onReadyChange={setReady}
      />

      <StartControls
        startCountdownEndsAt={lobby.startCountdownEndsAt}
        isHost={isHost}
        canStart={lobby.canStart}
        blocker={startBlocker(lobby, session.playerId)}
        onStart={startGame}
      />

      <Box sx={{ textAlign: 'center', mt: 3 }}>
        <Button
          color="inherit"
          onClick={() => {
            leaveRoom();
            clearSession();
            navigate('/');
          }}
          sx={{ color: 'text.secondary' }}
        >
          Leave room
        </Button>
      </Box>
    </Layout>
  );
}
