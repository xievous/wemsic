import { Box, Container, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import type { ReactNode } from 'react';

export function Layout({
  children,
  maxWidth = 'sm',
}: {
  children: ReactNode;
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg';
}) {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        background:
          'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(124,92,255,0.15), transparent)',
      }}
    >
      <Container maxWidth={maxWidth} sx={{ py: 4 }}>
        <Typography
          component={RouterLink}
          to="/"
          variant="h6"
          sx={{
            color: 'text.primary',
            textDecoration: 'none',
            mb: 4,
            display: 'inline-block',
            fontWeight: 700,
            letterSpacing: '-0.04em',
          }}
        >
          wemsic
        </Typography>
        {children}
      </Container>
    </Box>
  );
}
