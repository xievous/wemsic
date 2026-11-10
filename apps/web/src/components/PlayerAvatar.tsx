import { Box } from '@mui/material';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import { AVATAR_COLOR_COUNT } from '@wemsic/shared';
import { useSocket } from '../socket/SocketContext';
import { AVATAR_COLORS } from '../theme';

function fallbackInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function hashIndex(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h % AVATAR_COLOR_COUNT;
}

/**
 * A player's avatar: their colour and initials, which the server makes unique
 * in the room, looked up by id, so the lobby, the reveal's "Added by", the
 * leaderboard and the winner card all show the same face. Someone no longer
 * in the room falls back to a colour from their id and their name's initials.
 */
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
  const { lobby } = useSocket();
  const player = lobby?.players.find((p) => p.id === id);
  const look = AVATAR_COLORS[(player?.colorIndex ?? hashIndex(id)) % AVATAR_COLORS.length];
  const color = look.bg;
  const letters = player?.initials ?? fallbackInitials(name);
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
        color: look.text,
        fontWeight: 700,
        fontFamily: '"Fredoka", sans-serif',
        fontSize: size * 0.42,
        background: color,
        boxShadow: ring ? `0 0 0 3px #fff, 0 0 0 6px ${color}` : 'none',
      }}
    >
      {letters}
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
