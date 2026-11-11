import { Box } from '@mui/material';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import { lookFromSeed } from '@wemsic/shared';
import { useSocket } from '../socket/SocketContext';
import { BotAvatar, lookColor } from './avatar/BotAvatar';

/**
 * A player's avatar, the mini Eko they built on Create or Join, looked up by
 * id so the lobby, the reveal's "Added by", the leaderboard and the winner
 * card all show the same face. Someone no longer in the room falls back to a
 * look made from their id.
 */
export function PlayerAvatar({
  id,
  size = 40,
  done = false,
  ring = false,
}: {
  id: string;
  size?: number;
  done?: boolean;
  ring?: boolean;
}) {
  const { lobby } = useSocket();
  const look = lobby?.players.find((p) => p.id === id)?.avatar ?? lookFromSeed(id);
  return (
    <Box
      sx={{
        position: 'relative',
        width: size,
        height: size,
        flexShrink: 0,
        ...(ring && {
          borderRadius: '50%',
          bgcolor: '#fff',
          p: `${size * 0.08}px`,
          boxShadow: `0 0 0 3px ${lookColor(look)}`,
        }),
      }}
    >
      <BotAvatar look={look} />
      {done && (
        <Box
          sx={{
            position: 'absolute',
            right: -4,
            bottom: -2,
            width: size * 0.42,
            height: size * 0.42,
            borderRadius: '50%',
            bgcolor: 'success.main',
            border: '2px solid #fff',
            display: 'grid',
            placeItems: 'center',
            color: '#053D2E',
          }}
        >
          <CheckRoundedIcon sx={{ fontSize: size * 0.28 }} />
        </Box>
      )}
    </Box>
  );
}
