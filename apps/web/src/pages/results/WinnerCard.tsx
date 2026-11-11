import { Box, Stack, Typography } from '@mui/material';
import { keyframes } from '@mui/system';
import type { LeaderboardEntry } from '@wemsic/shared';
import { Eko } from '../../components/eko/Eko';
import { PlayerAvatar } from '../../components/PlayerAvatar';

const popIn = keyframes`
  0% { transform: scale(0.7) translateY(10px); opacity: 0; }
  60% { transform: scale(1.06); }
  100% { transform: scale(1) translateY(0); opacity: 1; }
`;

/** The gradient winner card, with Eko cheering above the winner. */
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
      {/* A soft white glow so Eko's blue stands out from the gradient. */}
      <Box
        sx={{
          width: { xs: 120, sm: 140 },
          mx: 'auto',
          mb: 1.5,
          background: 'radial-gradient(circle closest-side, rgba(255,255,255,0.4), rgba(255,255,255,0))',
        }}
      >
        <Eko face="love" move="roof" onDark entrance />
      </Box>
      <Stack direction="row" justifyContent="center" sx={{ mb: 1.5 }}>
        <PlayerAvatar id={winner.playerId} size={64} ring />
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
