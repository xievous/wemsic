import { Alert, Box, CircularProgress, Stack, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { reconnect } from '../api/client';
import { Layout } from '../components/Layout';
import { ReconnectingBanner } from '../components/ReconnectingBanner';
import { clearSession, loadSession, type Session } from '../hooks/useSession';
import { useSocket } from '../socket/SocketContext';
import { GameSettingsCard, GameSettingsSummary } from './lobby/GameSettingsCard';
import { ActionBar } from './lobby/ActionBar';
import { LOBBY_SIDE_WIDTH } from './lobby/layout';
import { MusicCard } from './lobby/MusicCard';
import { PlayerColumn, PlayerStrip } from './lobby/PlayerList';
import { HostModeNotice, JoinQrCard, RoomHeader } from './lobby/RoomHeader';
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
  // The shared screen shows a QR so players can scan to join.
  const presenter = hostMode && isHost;
  const roster = {
    players: lobby.players,
    myPlayerId: session.playerId,
    isHost,
    hostMode,
    onKick: kickPlayer,
  };

  return (
    <Layout maxWidth="lg">
      <ReconnectingBanner />
      <RoomHeader code={code} />

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

      {/* Phones and tablets: QR and an avatar strip above the cards. */}
      <Box sx={{ display: { md: 'none' } }}>
        {presenter && <JoinQrCard code={code} />}
        <PlayerStrip {...roster} />
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: `minmax(0, 1fr) ${LOBBY_SIDE_WIDTH}px` },
          columnGap: 3,
          alignItems: 'start',
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <MusicCard me={me} imports={imports} />
          {isHost ? (
            <GameSettingsCard settings={lobby.settings} onChange={updateSettings} />
          ) : (
            <GameSettingsSummary settings={lobby.settings} />
          )}
        </Box>

        {/* Desktop: the players column, which stays in view while the page scrolls. */}
        <Box sx={{ display: { xs: 'none', md: 'block' }, position: 'sticky', top: 16, mb: 3 }}>
          {presenter && <JoinQrCard code={code} />}
          <PlayerColumn {...roster} />
        </Box>
      </Box>

      <ActionBar
        lobby={lobby}
        myPlayerId={session.playerId}
        onReadyChange={setReady}
        onStart={startGame}
        onLeave={() => {
          leaveRoom();
          clearSession();
          navigate('/');
        }}
      />
    </Layout>
  );
}
