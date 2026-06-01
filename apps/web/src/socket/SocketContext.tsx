import type {
  GameEndPayload,
  LobbyState,
  RoundRevealPayload,
  RoundStartPayload,
} from '@wemsic/shared';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { io, type Socket } from 'socket.io-client';
import { API_URL } from '../config';

interface SocketContextValue {
  connected: boolean;
  lobby: LobbyState | null;
  round: RoundStartPayload | null;
  reveal: RoundRevealPayload | null;
  gameEnd: GameEndPayload | null;
  error: string | null;
  joinRoom: (roomCode: string, playerId: string) => void;
  setReady: (ready: boolean) => void;
  updateSettings: (settings: Partial<LobbyState['settings']>) => void;
  startGame: () => void;
  submitAnswer: (answer: unknown) => void;
  clearReveal: () => void;
}

const SocketContext = createContext<SocketContextValue | null>(null);

export function SocketProvider({ children }: { children: ReactNode }) {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [lobby, setLobby] = useState<LobbyState | null>(null);
  const [round, setRound] = useState<RoundStartPayload | null>(null);
  const [reveal, setReveal] = useState<RoundRevealPayload | null>(null);
  const [gameEnd, setGameEnd] = useState<GameEndPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const socket = io(API_URL, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('lobby:state', (state: LobbyState) => {
      setLobby(state);
      if (state.phase === 'playing' && !round) {
        /* wait for round:start */
      }
    });
    socket.on('round:start', (payload: RoundStartPayload) => {
      setRound(payload);
      setReveal(null);
    });
    socket.on('round:reveal', (payload: RoundRevealPayload) => {
      setReveal(payload);
      setRound(null);
    });
    socket.on('game:end', (payload: GameEndPayload) => {
      setGameEnd(payload);
      setRound(null);
      setReveal(null);
    });
    socket.on('error', (payload: { message: string }) => {
      setError(payload.message);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const joinRoom = useCallback((roomCode: string, playerId: string) => {
    socketRef.current?.emit('room:join', { roomCode, playerId });
  }, []);

  const setReady = useCallback((ready: boolean) => {
    socketRef.current?.emit('player:ready', { ready });
  }, []);

  const updateSettings = useCallback(
    (settings: Partial<LobbyState['settings']>) => {
      socketRef.current?.emit('host:settings', settings);
    },
    [],
  );

  const startGame = useCallback(() => {
    socketRef.current?.emit('host:start');
  }, []);

  const submitAnswer = useCallback((answer: unknown) => {
    socketRef.current?.emit('answer:submit', { answer });
  }, []);

  const clearReveal = useCallback(() => setReveal(null), []);

  return (
    <SocketContext.Provider
      value={{
        connected,
        lobby,
        round,
        reveal,
        gameEnd,
        error,
        joinRoom,
        setReady,
        updateSettings,
        startGame,
        submitAnswer,
        clearReveal,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket must be used within SocketProvider');
  return ctx;
}
