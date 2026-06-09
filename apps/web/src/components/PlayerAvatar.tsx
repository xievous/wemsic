import { Box } from '@mui/material';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import { colorForId } from '../theme';

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function PlayerAvatar({
  id,
  name,
  size = 40,
  done = false,
  ring = false,
}: {
  id: string;
  name: string;
  size?: number;
  done?: boolean;
  ring?: boolean;
}) {
  const color = colorForId(id);
  return (
    <Box
      sx={{
        position: 'relative',
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: '32%',
        display: 'grid',
        placeItems: 'center',
        color: '#fff',
        fontWeight: 700,
        fontFamily: '"Fredoka", sans-serif',
        fontSize: size * 0.42,
        background: color,
        boxShadow: ring ? `0 0 0 3px #fff, 0 0 0 6px ${color}` : 'none',
      }}
    >
      {initials(name)}
      {done && (
        <Box
          sx={{
            position: 'absolute',
            right: -4,
            bottom: -4,
            width: size * 0.46,
            height: size * 0.46,
            borderRadius: '50%',
            bgcolor: 'success.main',
            border: '2px solid #fff',
            display: 'grid',
            placeItems: 'center',
            color: '#053D2E',
          }}
        >
          <CheckRoundedIcon sx={{ fontSize: size * 0.3 }} />
        </Box>
      )}
    </Box>
  );
}
