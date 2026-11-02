import { Alert, Box, CircularProgress } from '@mui/material';
import { useSocket } from '../socket/SocketContext';

/** Floating notice while a dropped connection is being restored. */
export function ReconnectingBanner() {
  const { reconnecting } = useSocket();
  if (!reconnecting) return null;

  return (
    <Box
      sx={{
        position: 'fixed',
        top: { xs: 12, sm: 20 },
        left: 16,
        right: 16,
        display: 'flex',
        justifyContent: 'center',
        zIndex: 10,
        pointerEvents: 'none',
      }}
    >
      <Alert
        severity="warning"
        icon={<CircularProgress size={18} color="inherit" />}
        sx={{ borderRadius: '16px', boxShadow: '0 12px 30px -12px rgba(20,33,63,0.35)' }}
      >
        Connection lost. Reconnecting...
      </Alert>
    </Box>
  );
}
