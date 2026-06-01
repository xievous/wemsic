import { CssBaseline, ThemeProvider } from '@mui/material';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { SocketProvider } from './socket/SocketContext';
import { theme } from './theme';
import { CreateRoom } from './pages/CreateRoom';
import { Game } from './pages/Game';
import { JoinRoom } from './pages/JoinRoom';
import { Landing } from './pages/Landing';
import { Lobby } from './pages/Lobby';
import { Results } from './pages/Results';

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <SocketProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/create" element={<CreateRoom />} />
            <Route path="/join" element={<JoinRoom />} />
            <Route path="/join/:code" element={<JoinRoom />} />
            <Route path="/lobby/:code" element={<Lobby />} />
            <Route path="/game/:code" element={<Game />} />
            <Route path="/results/:code" element={<Results />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </SocketProvider>
    </ThemeProvider>
  );
}
