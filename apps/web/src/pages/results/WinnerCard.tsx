import { Box, Stack, Typography } from '@mui/material';
import { keyframes } from '@mui/system';
import type { LeaderboardEntry } from '@wemsic/shared';
import { PlayerAvatar } from '../../components/PlayerAvatar';

const popIn = keyframes`
  0% { transform: scale(0.7) translateY(10px); opacity: 0; }
  60% { transform: scale(1.06); }
  100% { transform: scale(1) translateY(0); opacity: 1; }
`;

/** The gradient winner card: the winner's avatar, name and points. */
export function WinnerCard({ winner }: { winner: LeaderboardEntry }) {
  return (
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
      <Stack direction="row" justifyContent="center" sx={{ mb: 2 }}>
        <PlayerAvatar id={winner.playerId} size={96} ring />
      </Stack>
      <Typography variant="h3" sx={{ color: '#fff' }}>
        {winner.displayName} wins
      </Typography>
      <Typography sx={{ opacity: 0.9, fontWeight: 600, mt: 0.5 }}>
        {winner.score} points
      </Typography>
    </Box>
  );
}
