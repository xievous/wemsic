import { Box, Button, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { Layout } from '../components/Layout';

export function Landing() {
  return (
    <Layout>
      <Box sx={{ pt: 6, pb: 8 }}>
        <Typography variant="h2" component="h1" gutterBottom>
          Music quiz,
          <br />
          your playlists.
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 5, maxWidth: 420 }}>
          Connect Spotify, mix everyone&apos;s taste, and compete in speed or typing
          rounds.
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <Button
            component={RouterLink}
            to="/create"
            variant="contained"
            size="large"
          >
            Create game
          </Button>
          <Button component={RouterLink} to="/join" variant="outlined" size="large">
            Join with code
          </Button>
        </Stack>
      </Box>
    </Layout>
  );
}
