import type {
  GameEndPayload,
  LobbyState,
  RoundProgressPayload,
  RoundRevealPayload,
  RoundStartPayload,
  TypingGuessResult,
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
  roundProgress: RoundProgressPayload | null;
  reveal: RoundRevealPayload | null;
  gameEnd: GameEndPayload | null;
  error: string | null;
  lastTypingResult: TypingGuessResult | null;
  joinRoom: (roomCode: string, playerId: string) => void;
  setReady: (ready: boolean) => void;
  updateSettings: (settings: Partial<LobbyState['settings']>) => void;
  startGame: () => void;
  kickPlayer: (targetId: string) => void;
  rematch: () => void;
  submitMcqAnswer: (optionId: string) => void;
  submitTypingGuess: (guess: string) => void;
  clearReveal: () => void;
  resetRoomState: () => void;
}

const SocketContext = createContext<SocketContextValue | null>(null);

export function SocketProvider({ children }: { children: ReactNode }) {
  const socketRef = useRef<Socket | null>(null);
  const activeRoomRef = useRef<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [lobby, setLobby] = useState<LobbyState | null>(null);
  const [round, setRound] = useState<RoundStartPayload | null>(null);
  const [roundProgress, setRoundProgress] =
    useState<RoundProgressPayload | null>(null);
  const [reveal, setReveal] = useState<RoundRevealPayload | null>(null);
  const [gameEnd, setGameEnd] = useState<GameEndPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastTypingResult, setLastTypingResult] =
    useState<TypingGuessResult | null>(null);

  const resetRoomState = useCallback(() => {
    activeRoomRef.current = null;
    setLobby(null);
    setRound(null);
    setRoundProgress(null);
    setReveal(null);
    setGameEnd(null);
    setLastTypingResult(null);
    setError(null);
  }, []);

  useEffect(() => {
    const socket = io(API_URL, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('typing:result', (result: TypingGuessResult) => {
      setLastTypingResult(result);
    });
    socket.on('lobby:state', (state: LobbyState) => {
      activeRoomRef.current = state.roomCode.toUpperCase();
      setLobby(state);
      if (state.phase === 'lobby') {
        setGameEnd(null);
        setReveal(null);
        setRound(null);
        setRoundProgress(null);
        setLastTypingResult(null);
      }
    });
    socket.on('round:start', (payload: RoundStartPayload) => {
      setLastTypingResult(null);
      setRound(payload);
      setRoundProgress({
        roundIndex: payload.roundIndex,
        roundEndsAt: payload.roundEndsAt,
        roundDurationMs: payload.roundDurationMs,
        players: payload.players,
      });
      setReveal(null);
    });
    socket.on('round:progress', (payload: RoundProgressPayload) => {
      setRoundProgress(payload);
    });
    socket.on('round:reveal', (payload: RoundRevealPayload) => {
      setReveal(payload);
      setRound(null);
      setRoundProgress(null);
      setLastTypingResult(null);
    });
    socket.on('game:end', (payload: GameEndPayload) => {
      setGameEnd(payload);
      setRound(null);
      setRoundProgress(null);
      setReveal(null);
      setLastTypingResult(null);
    });
    socket.on('error', (payload: { message: string }) => {
      setError(payload.message);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const joinRoom = useCallback((roomCode: string, playerId: string) => {
    const normalized = roomCode.toUpperCase();
    if (activeRoomRef.current !== normalized) {
      activeRoomRef.current = normalized;
      setLobby(null);
      setRound(null);
      setRoundProgress(null);
      setReveal(null);
      setGameEnd(null);
      setLastTypingResult(null);
      setError(null);
    }
    socketRef.current?.emit('room:join', { roomCode: normalized, playerId });
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

  const kickPlayer = useCallback((targetId: string) => {
    socketRef.current?.emit('host:kick', { targetId });
  }, []);

  const rematch = useCallback(() => {
    socketRef.current?.emit('room:rematch');
  }, []);

  const submitMcqAnswer = useCallback((optionId: string) => {
    socketRef.current?.emit('answer:submit', { optionId });
  }, []);

  const submitTypingGuess = useCallback((guess: string) => {
    socketRef.current?.emit('answer:typing', { guess });
  }, []);

  const clearReveal = useCallback(() => setReveal(null), []);

  return (
    <SocketContext.Provider
      value={{
        connected,
        lobby,
        round,
        roundProgress,
        reveal,
        gameEnd,
        error,
        lastTypingResult,
        joinRoom,
        setReady,
        updateSettings,
        startGame,
        kickPlayer,
        rematch,
        submitMcqAnswer,
        submitTypingGuess,
        clearReveal,
        resetRoomState,
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
