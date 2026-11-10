import { Box, Typography } from '@mui/material';
import { useState } from 'react';
import { colorForId } from '../theme';

/** Playlist covers in the lobby: big enough to read from across the room, two to a row on phones. */
export const COVER_SIZE = { xs: 140, sm: 160 };

/**
 * A playlist's square cover. Without an image (or if it fails to load) it
 * falls back to a gradient tile with the playlist's name on it.
 */
export function CoverArt({ name, imageUrl }: { name: string; imageUrl?: string | null }) {
  const [failed, setFailed] = useState(false);
  const base = colorForId(name);
  return (
    <Box
      sx={{
        position: 'relative',
        width: COVER_SIZE,
        height: COVER_SIZE,
        borderRadius: '14px',
        overflow: 'hidden',
        background: `linear-gradient(140deg, ${base} 0%, #3A6BFF 100%)`,
        boxShadow: '0 14px 28px -16px rgba(20,33,63,0.5)',
        display: 'flex',
        alignItems: 'flex-end',
        p: 1.25,
      }}
    >
      {imageUrl && !failed ? (
        <Box
          component="img"
          src={imageUrl}
          alt=""
          loading="lazy"
          onError={() => setFailed(true)}
          sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : (
        <Typography
          sx={{
            fontFamily: '"Fredoka", sans-serif',
            fontWeight: 700,
            fontSize: '1.1rem',
            lineHeight: 1.1,
            color: '#fff',
            textShadow: '0 2px 10px rgba(0,0,0,0.3)',
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {name}
        </Typography>
      )}
    </Box>
  );
}
