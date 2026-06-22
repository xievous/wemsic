import { Box, Button, Stack, Typography } from '@mui/material';
import { keyframes } from '@mui/system';
import EmojiEventsRoundedIcon from '@mui/icons-material/EmojiEventsRounded';
import ReplayRoundedIcon from '@mui/icons-material/ReplayRounded';
import { useEffect, useRef } from 'react';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { PlayerAvatar } from '../components/PlayerAvatar';
import { clearSession, useSession } from '../hooks/useSession';
import { useSocket } from '../socket/SocketContext';

const popIn = keyframes`
  0% { transform: scale(0.7) translateY(10px); opacity: 0; }
  60% { transform: scale(1.06); }
  100% { transform: scale(1) translateY(0); opacity: 1; }
`;

export function Results() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { gameEnd, lobby, joinRoom, connected, resetRoomState, rematch } =
    useSocket();
  const session = useSession();
  const joinedRef = useRef(false);

  useEffect(() => {
    if (!session || session.roomCode !== code?.toUpperCase()) {
      navigate('/');
      return;
    }
    if (!connected || joinedRef.current) return;
    joinedRef.current = true;
    joinRoom(session.roomCode, session.playerId);
  }, [code, connected, joinRoom, navigate, session]);

  // When anyone triggers a rematch the room returns to the lobby; follow it
  // back into the waiting room where playlists can be kept or swapped.
  useEffect(() => {
    if (lobby && lobby.roomCode === code?.toUpperCase() && lobby.phase === 'lobby') {
      navigate(`/lobby/${code}`);
    }
  }, [lobby, code, navigate]);

  const leaderboard =
    gameEnd?.leaderboard ??
    lobby?.players
      // In host mode the host is a presenter and never competes, so keep them
      // off the final scoreboard.
      .filter(
        (p) => !(lobby.settings.roomType === 'host' && p.id === lobby.hostPlayerId),
      )
      .map((p) => ({ playerId: p.id, displayName: p.displayName, score: p.score }))
      .sort((a, b) => b.score - a.score) ??
    [];

  const winner = leaderboard[0];
  const rest = leaderboard.slice(1);

  return (
    <Layout>
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Typography variant="overline" color="text.secondary">
          Game over
        </Typography>
        {winner && (
          <Box
            sx={{
              mt: 2,
              p: { xs: 3, sm: 4 },
              borderRadius: '28px',
              color: '#fff',
              background: 'linear-gradient(135deg, #3A6BFF 0%, #6C5CE7 50%, #00BFD8 100%)',
              boxShadow: '0 30px 60px -28px rgba(58,107,255,0.55)',
              animation: `${popIn} 0.55s cubic-bezier(0.16,1,0.3,1)`,
            }}
          >
            <EmojiEventsRoundedIcon sx={{ fontSize: 52, mb: 1 }} />
            <Stack direction="row" spacing={2} alignItems="center" justifyContent="center" sx={{ mb: 1.5 }}>
              <PlayerAvatar id={winner.playerId} name={winner.displayName} size={64} ring />
            </Stack>
            <Typography variant="h3" sx={{ color: '#fff' }}>
              {winner.displayName} wins
            </Typography>
            <Typography sx={{ opacity: 0.9, fontWeight: 600, mt: 0.5 }}>
              {winner.score} points
            </Typography>
          </Box>
        )}
      </Box>

      {rest.length > 0 && (
        <Box
          sx={{
            bgcolor: 'background.paper',
            border: '1px solid rgba(20,33,63,0.06)',
            borderRadius: '24px',
            p: { xs: 2, sm: 2.5 },
            mb: 4,
          }}
        >
          <Typography variant="overline" color="text.secondary">
            Final scores
          </Typography>
          <Stack spacing={1} sx={{ mt: 1 }}>
            {rest.map((entry, i) => {
              const isMe = entry.playerId === session?.playerId;
              return (
                <Stack
                  key={entry.playerId}
                  direction="row"
                  spacing={1.5}
                  alignItems="center"
                  sx={{
                    p: 1,
                    borderRadius: '16px',
                    bgcolor: isMe ? 'rgba(58,107,255,0.08)' : 'transparent',
                  }}
                >
                  <Typography
                    sx={{
                      width: 26,
                      textAlign: 'center',
                      fontWeight: 700,
                      color: 'text.secondary',
                      fontFamily: '"Fredoka", sans-serif',
                    }}
                  >
                    {i + 2}
                  </Typography>
                  <PlayerAvatar id={entry.playerId} name={entry.displayName} size={36} />
                  <Typography fontWeight={700} sx={{ flex: 1 }} noWrap>
                    {entry.displayName}
                    {isMe && <Box component="span" sx={{ color: 'primary.main' }}> · you</Box>}
                  </Typography>
                  <Typography fontWeight={700} sx={{ fontVariantNumeric: 'tabular-nums' }}>
                    {entry.score}
                  </Typography>
                </Stack>
              );
            })}
          </Stack>
        </Box>
      )}

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        justifyContent="center"
        alignItems="center"
      >
        <Button
          variant="contained"
          size="large"
          startIcon={<ReplayRoundedIcon />}
          onClick={() => rematch()}
          sx={{ minWidth: 200 }}
        >
          Rematch
        </Button>
        <Button
          component={RouterLink}
          to="/"
          variant="outlined"
          size="large"
          onClick={() => {
            clearSession();
            resetRoomState();
          }}
        >
          Back to home
        </Button>
      </Stack>
    </Layout>
  );
}
