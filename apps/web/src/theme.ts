import { createTheme } from '@mui/material/styles';

const display = '"Fredoka", "Outfit", system-ui, sans-serif';
const body = '"Outfit", system-ui, sans-serif';

// Deep navy "ink" used for high-contrast text and the dark stage panels.
export const INK = '#14213F';

/**
 * Vibrant accent set used for the trivia answer tiles. The palette is anchored
 * around blue and stays in cool territory (blue, cyan, teal, indigo, sky) with
 * a single warm amber for contrast. Order matters: option 0..3 map in turn, so
 * the first four are kept clearly distinct.
 */
export const TILE_COLORS = [
  { bg: '#3A6BFF', shadow: '#2348C9', text: '#FFFFFF' }, // royal blue
  { bg: '#00BFD8', shadow: '#0095AC', text: '#04303A' }, // cyan
  { bg: '#16C79A', shadow: '#0E9E79', text: '#053D2E' }, // teal mint
  { bg: '#6C5CE7', shadow: '#4F3FCB', text: '#FFFFFF' }, // indigo
  { bg: '#2DB7FF', shadow: '#1488C9', text: '#04303A' }, // sky
  { bg: '#FFB020', shadow: '#E0900A', text: '#14213F' }, // warm amber pop
] as const;

/** Avatar / player colours. Picked by a stable hash of the player id. */
export const AVATAR_COLORS = [
  '#3A6BFF',
  '#00BFD8',
  '#16C79A',
  '#6C5CE7',
  '#2DB7FF',
  '#7C4DFF',
  '#0FB5C9',
  '#FFB020',
];

export function colorForId(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) {
    h = (h * 31 + id.charCodeAt(i)) >>> 0;
  }
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#3A6BFF', contrastText: '#FFFFFF' },
    secondary: { main: '#00BFD8', contrastText: '#04303A' },
    success: { main: '#16C79A', contrastText: '#053D2E' },
    warning: { main: '#FFB020' },
    info: { main: '#2DB7FF' },
    error: { main: '#FF5470' },
    background: {
      default: '#F3F8FF',
      paper: '#FFFFFF',
    },
    text: {
      primary: INK,
      secondary: '#5B6B8C',
    },
    divider: 'rgba(20,33,63,0.08)',
  },
  typography: {
    fontFamily: body,
    h1: { fontFamily: display, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.02 },
    h2: { fontFamily: display, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.05 },
    h3: { fontFamily: display, fontWeight: 600, letterSpacing: '-0.01em', lineHeight: 1.1 },
    h4: { fontFamily: display, fontWeight: 600, lineHeight: 1.15 },
    h5: { fontFamily: display, fontWeight: 600 },
    h6: { fontFamily: display, fontWeight: 600 },
    overline: { fontWeight: 700, letterSpacing: '0.14em' },
    button: { textTransform: 'none', fontWeight: 600, fontFamily: body },
  },
  shape: { borderRadius: 18 },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#F3F8FF',
        },
        '*::selection': {
          background: 'rgba(58,107,255,0.18)',
        },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          borderRadius: 14,
          padding: '11px 26px',
          fontSize: '1rem',
          transition: 'transform 140ms cubic-bezier(0.16,1,0.3,1), box-shadow 140ms ease, background-color 140ms ease',
          '&:active': { transform: 'translateY(1px) scale(0.99)' },
        },
        sizeLarge: { padding: '15px 32px', fontSize: '1.05rem' },
        contained: {
          boxShadow: '0 10px 22px -10px rgba(58,107,255,0.6)',
          '&:hover': { boxShadow: '0 16px 30px -10px rgba(58,107,255,0.7)', transform: 'translateY(-2px)' },
        },
        containedSecondary: {
          boxShadow: '0 10px 22px -10px rgba(0,191,216,0.55)',
          '&:hover': { boxShadow: '0 16px 30px -10px rgba(0,191,216,0.6)', transform: 'translateY(-2px)' },
        },
        outlined: {
          borderWidth: 2,
          '&:hover': { borderWidth: 2, transform: 'translateY(-2px)' },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          borderRadius: 24,
          border: '1px solid rgba(20,33,63,0.06)',
          boxShadow: '0 18px 40px -24px rgba(20,33,63,0.28)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: { root: { backgroundImage: 'none' } },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 14,
          backgroundColor: '#FFFFFF',
          '& fieldset': { borderColor: 'rgba(20,33,63,0.14)', borderWidth: 2 },
          '&:hover fieldset': { borderColor: 'rgba(58,107,255,0.5)' },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 600, borderRadius: 999 },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: { borderRadius: 999, backgroundColor: 'rgba(20,33,63,0.08)' },
        bar: { borderRadius: 999 },
      },
    },
    MuiAlert: {
      styleOverrides: { root: { borderRadius: 16, fontWeight: 500 } },
    },
  },
});
