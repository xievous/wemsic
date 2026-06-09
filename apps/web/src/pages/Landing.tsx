import { Alert, Box, Button, Chip, Snackbar, Stack, Typography } from '@mui/material';
import { keyframes } from '@mui/system';
import GraphicEqRoundedIcon from '@mui/icons-material/GraphicEqRounded';
import BoltRoundedIcon from '@mui/icons-material/BoltRounded';
import KeyboardRoundedIcon from '@mui/icons-material/KeyboardRounded';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import { useState } from 'react';
import { Link as RouterLink, useSearchParams } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { TILE_COLORS } from '../theme';

const pulse = keyframes`
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.06); }
`;

const previewOptions = [
  'Blinding Lights',
  'As It Was',
  'good 4 u',
  'Levitating',
];

function MockRound() {
  return (
    <Box
      sx={{
        borderRadius: '28px',
        p: { xs: 2.5, sm: 3 },
        bgcolor: 'background.paper',
        border: '1px solid rgba(20,33,63,0.06)',
        boxShadow: '0 30px 60px -30px rgba(20,33,63,0.35)',
        transform: { md: 'rotate(2deg)' },
      }}
    >
      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2.5 }}>
        <Box
          sx={{
            width: 64,
            height: 64,
            borderRadius: '18px',
            flexShrink: 0,
            display: 'grid',
            placeItems: 'center',
            color: '#fff',
            background: 'linear-gradient(135deg, #3A6BFF, #00BFD8)',
            animation: `${pulse} 2.2s ease-in-out infinite`,
            '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
          }}
        >
          <GraphicEqRoundedIcon sx={{ fontSize: 34 }} />
        </Box>
        <Box>
          <Typography variant="overline" color="text.secondary">
            Now playing
          </Typography>
          <Typography variant="h6" sx={{ lineHeight: 1.1 }}>
            What&apos;s this track?
          </Typography>
        </Box>
      </Stack>
      <Stack spacing={1.25}>
        {previewOptions.map((label, i) => {
          const c = TILE_COLORS[i];
          return (
            <Box
              key={label}
              sx={{
                borderRadius: '14px',
                px: 2,
                py: 1.5,
                fontWeight: 600,
                color: c.text,
                background: c.bg,
                boxShadow: `0 5px 0 ${c.shadow}`,
              }}
            >
              {label}
            </Box>
          );
        })}
      </Stack>
    </Box>
  );
}

export function Landing() {
  const [searchParams] = useSearchParams();
  const [removed, setRemoved] = useState(searchParams.get('removed') === '1');
  return (
    <Layout maxWidth="lg">
      <Snackbar
        open={removed}
        autoHideDuration={5000}
        onClose={() => setRemoved(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity="info" onClose={() => setRemoved(false)} variant="filled">
          The host removed you from that room.
        </Alert>
      </Snackbar>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1.1fr 0.9fr' },
          gap: { xs: 5, md: 6 },
          alignItems: 'center',
          pt: { xs: 2, md: 4 },
        }}
      >
        <Box>
          <Chip
            icon={<GroupsRoundedIcon />}
            label="Music trivia with your friends"
            sx={{
              mb: 3,
              py: 2.2,
              px: 0.5,
              bgcolor: 'rgba(58,107,255,0.1)',
              color: 'primary.main',
              fontWeight: 600,
              '& .MuiChip-icon': { color: 'primary.main' },
            }}
          />
          <Typography variant="h1" sx={{ fontSize: { xs: '2.7rem', sm: '3.6rem', md: '4.1rem' } }}>
            Name the song
            <Box component="span" sx={{ color: 'primary.main' }}> before</Box>
            {' '}everyone else.
          </Typography>
          <Typography
            color="text.secondary"
            sx={{ mt: 2.5, mb: 4, fontSize: '1.15rem', maxWidth: 460 }}
          >
            Pull in everyone&apos;s playlists, hit play, and race to guess the track.
            Loud, fast, and a little chaotic.
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <Button component={RouterLink} to="/create" variant="contained" size="large">
              Start a game
            </Button>
            <Button component={RouterLink} to="/join" variant="outlined" size="large">
              Join with a code
            </Button>
          </Stack>

          <Stack
            direction="row"
            flexWrap="wrap"
            useFlexGap
            spacing={1.25}
            sx={{ mt: 5 }}
          >
            <Feature icon={<BoltRoundedIcon />} color="#3A6BFF" text="Speed rounds" />
            <Feature icon={<KeyboardRoundedIcon />} color="#16C79A" text="Typing rounds" />
            <Feature icon={<GraphicEqRoundedIcon />} color="#00BFD8" text="Your playlists" />
          </Stack>
        </Box>

        <MockRound />
      </Box>
    </Layout>
  );
}

function Feature({
  icon,
  color,
  text,
}: {
  icon: React.ReactNode;
  color: string;
  text: string;
}) {
  return (
    <Stack
      direction="row"
      spacing={1}
      alignItems="center"
      sx={{
        bgcolor: 'background.paper',
        border: '1px solid rgba(20,33,63,0.06)',
        borderRadius: 999,
        pl: 1,
        pr: 2,
        py: 0.75,
      }}
    >
      <Box
        sx={{
          width: 30,
          height: 30,
          borderRadius: '50%',
          display: 'grid',
          placeItems: 'center',
          color: '#fff',
          bgcolor: color,
          '& svg': { fontSize: 18 },
        }}
      >
        {icon}
      </Box>
      <Typography variant="body2" fontWeight={600}>
        {text}
      </Typography>
    </Stack>
  );
}
