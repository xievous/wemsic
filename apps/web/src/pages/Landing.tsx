import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import { Alert, Box, Button, ButtonBase, Snackbar, Stack, Typography } from '@mui/material';
import { keyframes } from '@mui/system';
import { useEffect, useRef, useState } from 'react';
import { Link as RouterLink, useSearchParams } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { createDemoClock, DEMO_STEPS } from './landing/demoSteps';
import { HowItWorksDemo, usePrefersReducedMotion } from './landing/HowItWorksDemo';

const rise = keyframes`from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; }`;

/** The demo's current step: moves on by itself, jumps on a tap, holds while the tab is hidden. */
function useDemoStep(still: boolean) {
  const [state, setState] = useState({ step: 0, run: 0 });
  const clockRef = useRef<ReturnType<typeof createDemoClock> | null>(null);

  useEffect(() => {
    const clock = createDemoClock({
      auto: !still,
      onStep: (step) => setState((s) => ({ step, run: s.run + 1 })),
    });
    clockRef.current = clock;
    clock.start();
    const onVisibility = () => clock.setPaused(document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    onVisibility();
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      clock.stop();
    };
  }, [still]);

  return { ...state, jump: (n: number) => clockRef.current?.jump(n) };
}

/**
 * The first page: "Pick. Play. Guess." in big type (it's often read from the
 * sofa), lit one verb at a time while Eko acts that step out beside it, then
 * the two ways in.
 */
export function Landing() {
  const [searchParams] = useSearchParams();
  const [removed, setRemoved] = useState(searchParams.get('removed') === '1');
  const still = usePrefersReducedMotion();
  const { step, run, jump } = useDemoStep(still);

  return (
    <Layout maxWidth="lg">
      <Snackbar
        open={removed}
        autoHideDuration={5000}
        onClose={() => setRemoved(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity="info" onClose={() => setRemoved(false)} variant="filled">
          You're no longer in that room. The host removed you, or you were away too long.
        </Alert>
      </Snackbar>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'minmax(0, 1fr) minmax(0, 1.05fr)' },
          gridTemplateAreas: { xs: '"verbs" "demo" "ways"', md: '"verbs demo" "ways demo"' },
          gridTemplateRows: { md: 'auto 1fr' },
          columnGap: 6,
          rowGap: { xs: 3, md: 0 },
          // The demo card's top lines up with the top of "Pick.".
          alignItems: 'start',
        }}
      >
        <Box sx={{ gridArea: 'verbs', minWidth: 0 }}>
          <Typography component="h1" sx={{ m: 0 }}>
            <Box
              component="span"
              role="group"
              aria-label="Pick. Play. Guess."
              sx={{
                display: 'flex',
                flexDirection: { xs: 'row', md: 'column' },
                flexWrap: 'wrap',
                alignItems: 'flex-start',
                columnGap: 1.25,
              }}
            >
              {DEMO_STEPS.map((s, i) => {
                const lit = i === step;
                return (
                  <ButtonBase
                    key={s.verb}
                    aria-pressed={lit}
                    onClick={() => jump(i)}
                    disableRipple
                    sx={{
                      fontFamily: '"Fredoka", sans-serif',
                      fontWeight: 700,
                      fontSize: { xs: '2.6rem', sm: '4rem', md: '7rem' },
                      lineHeight: 0.98,
                      letterSpacing: '-0.02em',
                      color: lit ? 'primary.main' : 'rgba(20,33,63,0.16)',
                      transform: { md: lit ? 'translateX(6px)' : 'none' },
                      transition: 'color 250ms ease, transform 250ms cubic-bezier(.16,1,.3,1)',
                      '&:hover': { color: lit ? 'primary.main' : 'rgba(20,33,63,0.32)' },
                      '&.Mui-focusVisible': { outline: '3px solid', outlineColor: 'primary.main', outlineOffset: 4, borderRadius: 2 },
                    }}
                  >
                    {s.verb}
                    <Box component="span" sx={{ color: 'text.primary', opacity: lit ? 1 : 0.18 }}>
                      .
                    </Box>
                  </ButtonBase>
                );
              })}
            </Box>
          </Typography>
          <Typography
            aria-live="polite"
            sx={{
              mt: { xs: 1, md: 2.5 },
              fontWeight: 600,
              fontSize: { xs: '1.2rem', md: '1.8rem' },
              lineHeight: 1.25,
              minHeight: { md: '2.5em' },
            }}
          >
            <Box key={run} component="span" sx={{ display: 'inline-block', animation: `${rise} 400ms cubic-bezier(.16,1,.3,1)` }}>
              {DEMO_STEPS[step]!.line}
            </Box>
          </Typography>
        </Box>

        <Box sx={{ gridArea: 'demo', minWidth: 0 }}>
          <HowItWorksDemo step={step} run={run} still={still} onJump={jump} />
        </Box>

        <Box sx={{ gridArea: 'ways', minWidth: 0, pt: { md: 2 } }}>
          <Typography
            color="text.secondary"
            sx={{ display: { xs: 'none', sm: 'block' }, fontSize: '1.35rem', lineHeight: 1.45, maxWidth: '36ch', mb: 3.5 }}
          >
            A music quiz built from popular playlists or your own. Name the song before everyone else.
          </Typography>
          <Stack direction="row" spacing={1.75}>
            <Button
              component={RouterLink}
              to="/create"
              variant="contained"
              size="large"
              startIcon={<PlayArrowRoundedIcon />}
              sx={{ flex: { xs: 1, sm: 'none' }, py: 2, px: { xs: 2, sm: 3.5 }, fontSize: { xs: '1.1rem', sm: '1.3rem' }, fontWeight: 700 }}
            >
              Start a game
            </Button>
            <Button
              component={RouterLink}
              to="/join"
              variant="outlined"
              size="large"
              sx={{ flex: { xs: 1, sm: 'none' }, py: 2, px: { xs: 2, sm: 3.5 }, fontSize: { xs: '1.1rem', sm: '1.3rem' }, fontWeight: 700 }}
            >
              Join with a code
            </Button>
          </Stack>
        </Box>
      </Box>
    </Layout>
  );
}
