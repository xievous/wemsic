import { Box, Stack, Typography } from '@mui/material';
import VolumeUpRoundedIcon from '@mui/icons-material/VolumeUpRounded';
import type { RoundRevealPayload } from '@wemsic/shared';
import { PlayerAvatar } from '../../components/PlayerAvatar';
import { RoundProgressBar } from '../../components/RoundProgressBar';
import { popIn } from '../../styles/animations';

/**
 * Answer card + leaderboard between rounds, shared by online players and the
 * host presenter. The presenter doesn't score, so their card has no points pill.
 */
export function RoundReveal({
  reveal,
  playerId,
  revealProgress,
  presenter = false,
}: {
  reveal: RoundRevealPayload;
  playerId: string;
  revealProgress: number;
  presenter?: boolean;
}) {
  const myScore = reveal.roundScores[playerId] ?? 0;
  const scored = myScore > 0;
  return (
    <Stack spacing={2.5}>
      <Box
        sx={{
          position: 'relative',
          overflow: 'hidden',
          borderRadius: '28px',
          p: { xs: 2.5, sm: 3.5 },
          color: '#fff',
          background: 'linear-gradient(135deg, #0E1A3C 0%, #1A2A6B 60%, #2A3F9E 100%)',
          boxShadow: '0 30px 60px -30px rgba(14,26,60,0.75)',
        }}
      >
        <Stack direction="row" spacing={2.5} alignItems="center">
          {reveal.albumArtUrl ? (
            <Box
              component="img"
              src={reveal.albumArtUrl}
              alt={`${reveal.correctTitle} album art`}
              sx={{
                width: { xs: 96, sm: 130 },
                height: { xs: 96, sm: 130 },
                borderRadius: '20px',
                flexShrink: 0,
                boxShadow: '0 16px 36px -12px rgba(0,0,0,0.6)',
                animation: `${popIn} 0.5s cubic-bezier(0.16,1,0.3,1)`,
              }}
            />
          ) : (
            <Box
              sx={{
                width: { xs: 96, sm: 130 },
                height: { xs: 96, sm: 130 },
                borderRadius: '20px',
                flexShrink: 0,
                display: 'grid',
                placeItems: 'center',
                bgcolor: 'rgba(255,255,255,0.12)',
              }}
            >
              <VolumeUpRoundedIcon sx={{ fontSize: 44 }} />
            </Box>
          )}
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="overline" sx={{ opacity: 0.7 }}>
              The track was
            </Typography>
            <Typography variant="h4" sx={{ color: '#fff', lineHeight: 1.1 }}>
              {reveal.correctTitle}
            </Typography>
            <Typography sx={{ opacity: 0.85, mt: 0.5, fontSize: '1.05rem' }}>
              {reveal.correctArtists.join(', ')}
            </Typography>
          </Box>
        </Stack>
        <Box sx={{ mt: 2.5 }}>
          <RoundProgressBar
            progress={revealProgress}
            size={presenter ? 'large' : 'default'}
          />
        </Box>
        {!presenter && (
          <Box
            sx={{
              mt: 2.5,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 1,
              px: 2,
              py: 1,
              borderRadius: 999,
              bgcolor: scored ? 'rgba(22,199,154,0.25)' : 'rgba(255,255,255,0.1)',
              animation: `${popIn} 0.5s cubic-bezier(0.16,1,0.3,1) 0.15s both`,
            }}
          >
            <Typography variant="h6" sx={{ color: scored ? '#7CF0CE' : '#fff' }}>
              {scored ? `+${myScore} points` : 'No points this round'}
            </Typography>
          </Box>
        )}
      </Box>

      <Box
        sx={{
          bgcolor: 'background.paper',
          border: '1px solid rgba(20,33,63,0.06)',
          borderRadius: '24px',
          p: { xs: 2, sm: 2.5 },
        }}
      >
        <Typography variant="overline" color="text.secondary">
          Leaderboard
        </Typography>
        <Stack spacing={1} sx={{ mt: 1 }}>
          {reveal.leaderboard.map((e, i) => {
            const isMe = e.playerId === playerId;
            return (
              <Stack
                key={e.playerId}
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
                    color: i === 0 ? 'warning.main' : 'text.secondary',
                    fontFamily: '"Fredoka", sans-serif',
                  }}
                >
                  {i + 1}
                </Typography>
                <PlayerAvatar id={e.playerId} name={e.displayName} size={34} />
                <Typography fontWeight={700} sx={{ flex: 1 }} noWrap>
                  {e.displayName}
                  {isMe && <Box component="span" sx={{ color: 'primary.main' }}> · you</Box>}
                </Typography>
                <Typography fontWeight={700} sx={{ fontVariantNumeric: 'tabular-nums' }}>
                  {e.score}
                </Typography>
              </Stack>
            );
          })}
        </Stack>
      </Box>
    </Stack>
  );
}
