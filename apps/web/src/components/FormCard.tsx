import { Box, TextField, Typography } from '@mui/material';
import type { ComponentProps, ReactNode } from 'react';

/** The white card Create and Join sit in, with a big title readable at a glance. */
export function FormCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Box
      sx={{
        bgcolor: 'background.paper',
        border: '1px solid rgba(20,33,63,0.06)',
        borderRadius: '24px',
        boxShadow: '0 24px 50px -28px rgba(20,33,63,0.35)',
        p: { xs: 2.5, sm: 4 },
      }}
    >
      <Typography
        component="h1"
        sx={{
          fontFamily: '"Fredoka", sans-serif',
          fontWeight: 700,
          fontSize: { xs: '2.3rem', sm: '3.4rem' },
          letterSpacing: '-0.02em',
          lineHeight: 1,
          mb: { xs: 2.5, sm: 3.5 },
        }}
      >
        {title}
      </Typography>
      {children}
    </Box>
  );
}

/** The avatar maker beside the fields on desktop, above them on phones. */
export function MakerAndFields({ maker, children }: { maker: ReactNode; children: ReactNode }) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'auto minmax(0, 1fr)' },
        gap: { xs: 3, md: 4.5 },
        alignItems: 'center',
      }}
    >
      {maker}
      <Box sx={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2.25 }}>{children}</Box>
    </Box>
  );
}

/** A big field with its label above it. `code` sets it as a spaced-out room code. */
export function BigField({
  id,
  label,
  code = false,
  ...props
}: { id: string; label: string; code?: boolean } & ComponentProps<typeof TextField>) {
  return (
    <Box>
      <Typography
        component="label"
        htmlFor={id}
        sx={{ display: 'block', mb: 1, fontWeight: 700, fontSize: '1.15rem', color: 'text.secondary' }}
      >
        {label}
      </Typography>
      <TextField
        id={id}
        fullWidth
        {...props}
        sx={{
          '& .MuiOutlinedInput-root': { borderRadius: '16px' },
          '& .MuiInputBase-input': code
            ? {
                fontFamily: '"Fredoka", sans-serif',
                fontWeight: 700,
                fontSize: { xs: '1.8rem', sm: '2.4rem' },
                letterSpacing: { xs: '0.25em', sm: '0.35em' },
                textAlign: 'center',
                textTransform: 'uppercase',
                py: 1.5,
              }
            : { fontWeight: 600, fontSize: { xs: '1.3rem', sm: '1.6rem' }, py: { xs: 1.5, sm: 2 } },
        }}
      />
    </Box>
  );
}

/** The page's one big action. */
export const BIG_BUTTON_SX = {
  py: { xs: 1.75, sm: 2.25 },
  fontSize: { xs: '1.3rem', sm: '1.6rem' },
  fontWeight: 700,
  borderRadius: '18px',
} as const;
