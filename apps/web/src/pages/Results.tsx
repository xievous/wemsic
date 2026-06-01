import {
  Box,
  Button,
  Card,
  CardContent,
  Stack,
  Typography,
} from '@mui/material';
import { useEffect } from 'react';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { clearSession, loadSession } from '../hooks/useSession';
import { useSocket } from '../socket/SocketContext';

export function Results() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { gameEnd, lobby, joinRoom, connected } = useSocket();
  const session = loadSession();

  useEffect(() => {
    if (!session || session.roomCode !== code?.toUpperCase()) {
      navigate('/');
      return;
    }
    if (connected) joinRoom(session.roomCode, session.playerId);
  }, [code, connected, joinRoom, navigate, session]);

  const leaderboard = gameEnd?.leaderboard ?? lobby?.players.map((p) => ({
    playerId: p.id,
    displayName: p.displayName,
    score: p.score,
  })).sort((a, b) => b.score - a.score) ?? [];

  const winner = leaderboard[0];

  return (
    <Layout>
      <Box textAlign="center" py={4}>
        <Typography variant="overline" color="text.secondary">
          Game over
        </Typography>
        {winner && (
          <Typography variant="h3" sx={{ mt: 1, mb: 4 }}>
            {winner.displayName} wins
          </Typography>
        )}
      </Box>

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Final scores
          </Typography>
          <Stack spacing={2}>
            {leaderboard.map((entry, i) => (
              <Stack
                key={entry.playerId}
                direction="row"
                justifyContent="space-between"
                alignItems="center"
              >
                <Typography>
                  <Box
                    component="span"
                    sx={{
                      display: 'inline-block',
                      width: 28,
                      color: i === 0 ? 'primary.main' : 'text.secondary',
                      fontWeight: i === 0 ? 700 : 400,
                    }}
                  >
                    {i + 1}.
                  </Box>{' '}
                  {entry.displayName}
                  {entry.playerId === session?.playerId && (
                    <Typography component="span" variant="body2" color="text.secondary">
                      {' '}
                      (you)
                    </Typography>
                  )}
                </Typography>
                <Typography fontWeight={700}>{entry.score}</Typography>
              </Stack>
            ))}
          </Stack>
        </CardContent>
      </Card>

      <Stack direction="row" spacing={2} sx={{ mt: 4 }} justifyContent="center">
        <Button
          component={RouterLink}
          to="/"
          variant="contained"
          onClick={() => clearSession()}
        >
          Back home
        </Button>
      </Stack>
    </Layout>
  );
}
