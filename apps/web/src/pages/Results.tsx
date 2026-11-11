import { Alert, Box, Button, Stack, Typography } from '@mui/material';
import ReplayRoundedIcon from '@mui/icons-material/ReplayRounded';
import { COMPACT_ROSTER_AFTER } from '@wemsic/shared';
import { useEffect, useRef, useState } from 'react';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import { Eko } from '../components/eko/Eko';
import { Layout } from '../components/Layout';
import { ReconnectingBanner } from '../components/ReconnectingBanner';
import { ScoreList } from '../components/ScoreList';
import { clearSession, useSession } from '../hooks/useSession';
import { useSocket } from '../socket/SocketContext';
import { WinnerCard } from './results/WinnerCard';

export function Results() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { gameEnd, lobby, joinRoom, connected, leaveRoom, rematch } = useSocket();
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

  // Nobody scored if no round was played, so there's no winner to show.
  const noRoundsPlayed = gameEnd?.roundsPlayed === 0;
  const winner = noRoundsPlayed ? undefined : leaderboard[0];
  const rest = noRoundsPlayed ? [] : leaderboard.slice(1);
  // A big room shows the top 5 and your place, with everyone a tap away.
  const compact = leaderboard.length > COMPACT_ROSTER_AFTER;
  const [showAll, setShowAll] = useState(false);

  return (
    <Layout>
      <ReconnectingBanner />
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Typography variant="overline" color="text.secondary">
          Game over
        </Typography>
        {noRoundsPlayed && (
          <Box sx={{ width: 110, mx: 'auto', mt: 1 }}>
            <Eko face="oops" move="slump" />
          </Box>
        )}
        {gameEnd?.reason === 'out_of_tracks' && (
          <Alert severity={noRoundsPlayed ? 'warning' : 'info'} sx={{ mt: 2, textAlign: 'left' }}>
            {noRoundsPlayed
              ? "None of the songs had a playable preview, so no rounds could be played. Try adding a different playlist."
              : `Ran out of playable songs after ${gameEnd.roundsPlayed} of ${gameEnd.totalRounds} rounds. Add more playlists for a longer game.`}
          </Alert>
        )}
        {winner && <WinnerCard winner={winner} />}
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
          <ScoreList
            entries={rest}
            myId={session?.playerId}
            compact={compact}
            showAll={showAll}
            firstPosition={2}
            show={4}
          />
          {compact && (
            <Button
              variant="outlined"
              fullWidth
              onClick={() => setShowAll((v) => !v)}
              sx={{ mt: 1.5, borderRadius: '14px', borderWidth: 2, fontWeight: 700, '&:hover': { borderWidth: 2 } }}
            >
              {showAll ? 'Show the top 5' : `Show all ${leaderboard.length}`}
            </Button>
          )}
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
            leaveRoom();
            clearSession();
          }}
        >
          Back to home
        </Button>
      </Stack>
    </Layout>
  );
}
