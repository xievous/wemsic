import { Box, Stack, Typography } from '@mui/material';
import { useAudio } from '../../audio/AudioProvider';
import { BouncingBars } from '../../components/BouncingBars';
import { RoundProgressBar } from '../../components/RoundProgressBar';
import { EnableSoundButton, VolumeControl } from './SoundControls';

/** The dark "now playing" card with the countdown, equalizer and sound controls. */
export function Stage({
  roundIndex,
  totalRounds,
  timeLeft,
  progress,
  presenter = false,
}: {
  roundIndex: number;
  totalRounds: number;
  timeLeft: number;
  progress: number;
  presenter?: boolean;
}) {
  const { enabled: audioEnabled, enableAudio, volume, setVolume } = useAudio();
  const seconds = (timeLeft / 1000).toFixed(1);
  const low = timeLeft <= 5000;
  return (
    <Box
      sx={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: presenter ? '32px' : '28px',
        p: presenter ? { xs: 3, sm: 4.5 } : { xs: 2.5, sm: 3.5 },
        color: '#fff',
        background: 'linear-gradient(135deg, #0E1A3C 0%, #1A2A6B 55%, #2A3F9E 100%)',
        boxShadow: '0 30px 60px -30px rgba(14,26,60,0.75)',
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
        <Box>
          <Typography variant="overline" sx={{ opacity: 0.7 }}>
            Round {roundIndex + 1} of {totalRounds}
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5, ml: -0.5 }}>
            {audioEnabled ? (
              <VolumeControl volume={volume} onChange={setVolume} />
            ) : (
              <EnableSoundButton onClick={enableAudio} />
            )}
            <Typography variant="h5" sx={{ color: '#fff' }}>
              Now playing
            </Typography>
          </Stack>
        </Box>
        <Box sx={{ textAlign: 'right' }}>
          <Typography
            sx={{
              fontFamily: '"Fredoka", sans-serif',
              fontWeight: 700,
              lineHeight: 1,
              fontSize: presenter
                ? { xs: '3rem', sm: '3.8rem' }
                : { xs: '2.6rem', sm: '3.2rem' },
              color: low ? '#FFB020' : '#fff',
              transition: 'color 200ms ease',
            }}
          >
            {seconds}
          </Typography>
          <Typography variant="caption" sx={{ opacity: 0.7 }}>
            seconds left
          </Typography>
        </Box>
      </Stack>

      <Box sx={{ mt: presenter ? 3.5 : 2.5, mb: presenter ? 2 : 1.5 }}>
        <BouncingBars variant={presenter ? 'stageLarge' : 'stage'} />
      </Box>

      <RoundProgressBar progress={progress} low={low} size={presenter ? 'large' : 'default'} />
    </Box>
  );
}
