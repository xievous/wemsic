import { Box, Container, Stack } from '@mui/material';
import { keyframes } from '@mui/system';
import { Link as RouterLink } from 'react-router-dom';
import type { ReactNode } from 'react';

const drift = keyframes`
  0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
  50% { transform: translate3d(4%, -3%, 0) scale(1.12); }
`;

const bounce = keyframes`
  0%, 100% { transform: scaleY(0.4); }
  50% { transform: scaleY(1); }
`;

function Blob({
  color,
  size,
  top,
  left,
  right,
  bottom,
  delay,
}: {
  color: string;
  size: number;
  top?: string | number;
  left?: string | number;
  right?: string | number;
  bottom?: string | number;
  delay: number;
}) {
  return (
    <Box
      aria-hidden
      sx={{
        position: 'absolute',
        top,
        left,
        right,
        bottom,
        width: size,
        height: size,
        borderRadius: '50%',
        background: color,
        filter: 'blur(80px)',
        opacity: 0.5,
        animation: `${drift} 18s ease-in-out infinite`,
        animationDelay: `${delay}s`,
        '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
      }}
    />
  );
}

function Wordmark() {
  return (
    <Stack
      component={RouterLink}
      to="/"
      direction="row"
      spacing={1}
      alignItems="center"
      sx={{ textDecoration: 'none', mb: { xs: 3, sm: 4 }, width: 'fit-content' }}
    >
      <Stack
        direction="row"
        spacing={0.4}
        alignItems="flex-end"
        sx={{ height: 24 }}
        aria-hidden
      >
        {[
          { c: '#3A6BFF', d: 0 },
          { c: '#00BFD8', d: 0.2 },
          { c: '#16C79A', d: 0.4 },
          { c: '#6C5CE7', d: 0.6 },
        ].map((bar) => (
          <Box
            key={bar.c}
            sx={{
              width: 5,
              height: 22,
              borderRadius: 999,
              transformOrigin: 'bottom',
              background: bar.c,
              animation: `${bounce} 1.1s ease-in-out infinite`,
              animationDelay: `${bar.d}s`,
              '@media (prefers-reduced-motion: reduce)': {
                animation: 'none',
                transform: 'scaleY(0.7)',
              },
            }}
          />
        ))}
      </Stack>
      <Box
        component="span"
        sx={{
          fontFamily: '"Fredoka", sans-serif',
          fontWeight: 700,
          fontSize: '1.6rem',
          letterSpacing: '-0.02em',
          color: 'text.primary',
        }}
      >
        wemsic
      </Box>
    </Stack>
  );
}

export function Layout({
  children,
  maxWidth = 'sm',
  hideWordmark = false,
}: {
  children: ReactNode;
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg';
  hideWordmark?: boolean;
}) {
  return (
    <Box
      sx={{
        position: 'relative',
        minHeight: '100dvh',
        overflow: 'hidden',
        background:
          'linear-gradient(180deg, #F3F8FF 0%, #E9F2FF 100%)',
      }}
    >
      <Box
        aria-hidden
        sx={{
          position: 'fixed',
          inset: 0,
          zIndex: 0,
          pointerEvents: 'none',
        }}
      >
        <Blob color="#3A6BFF" size={420} top="-8%" left="-6%" delay={0} />
        <Blob color="#00BFD8" size={360} top="20%" right="-10%" delay={4} />
        <Blob color="#16C79A" size={340} bottom="-12%" left="10%" delay={8} />
      </Box>

      <Container
        maxWidth={maxWidth}
        sx={{ position: 'relative', zIndex: 1, py: { xs: 3, sm: 5 } }}
      >
        {!hideWordmark && <Wordmark />}
        {children}
      </Container>
    </Box>
  );
}
