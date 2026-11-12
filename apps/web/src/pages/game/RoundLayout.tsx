import { Box } from '@mui/material';
import type { ReactNode } from 'react';

/** A round's page: the game, with the players right beside it (below it on phones). */
export function RoundLayout({
  game,
  players,
  presenter = false,
}: {
  game: ReactNode;
  players: ReactNode;
  presenter?: boolean;
}) {
  const sideWidth = presenter ? 380 : 300;
  return (
    <Box
      sx={{
        display: 'grid',
        alignItems: 'start',
        gap: { xs: 3, md: presenter ? 5 : 4 },
        gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: `minmax(0, 1fr) ${sideWidth}px` },
      }}
    >
      <Box sx={{ minWidth: 0 }}>{game}</Box>
      <Box sx={{ minWidth: 0 }}>{players}</Box>
    </Box>
  );
}
