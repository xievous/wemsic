import type { Server, Socket } from 'socket.io';
import type { RoomManager } from '../rooms/RoomManager.js';

export function registerSocketHandlers(
  io: Server,
  roomManager: RoomManager,
): void {
  io.on('connection', (socket: Socket) => {
    let roomCode: string | null = null;
    let playerId: string | null = null;

    socket.on('room:join', (payload: { roomCode: string; playerId: string }) => {
      const nextCode = payload.roomCode.toUpperCase();
      if (roomCode && roomCode !== nextCode) {
        socket.leave(`room:${roomCode}`);
      }
      roomCode = nextCode;
      playerId = payload.playerId;
      socket.join(`room:${roomCode}`);

      const state = roomManager.getLobbyState(roomCode);
      if (state) socket.emit('lobby:state', state);
    });

    socket.on('player:ready', (payload: { ready: boolean }) => {
      if (!roomCode || !playerId) return;
      roomManager.setReady(roomCode, playerId, payload.ready);
    });

    socket.on(
      'host:settings',
      (payload: {
        gameMode?: 'speed_choice' | 'typing';
        roundCount?: number;
        roundDurationSeconds?: number;
        typingSpellingLeniency?: 'normal' | 'hard' | 'lenient';
        showOthersGuesses?: boolean;
      }) => {
        if (!roomCode || !playerId) return;
        roomManager.updateSettings(roomCode, playerId, payload);
      },
    );

    socket.on('host:start', async () => {
      if (!roomCode || !playerId) return;
      const err = roomManager.toggleStartCountdown(roomCode, playerId);
      if (err) socket.emit('error', { message: err });
    });

    socket.on('host:kick', (payload: { targetId: string }) => {
      if (!roomCode || !playerId || !payload?.targetId) return;
      roomManager.kickPlayer(roomCode, playerId, payload.targetId);
    });

    socket.on('room:rematch', () => {
      if (!roomCode || !playerId) return;
      roomManager.rematch(roomCode, playerId);
    });

    socket.on('answer:submit', (payload: { optionId: string }) => {
      if (!roomCode || !playerId) return;
      const ok = roomManager.submitMcqAnswer(
        roomCode,
        playerId,
        payload.optionId,
      );
      if (!ok) socket.emit('error', { message: 'Could not submit answer' });
      else socket.emit('answer:ack', { ok: true });
    });

    socket.on('answer:typing', (payload: { guess: string }) => {
      if (!roomCode || !playerId) return;
      const result = roomManager.submitTypingGuess(
        roomCode,
        playerId,
        payload.guess ?? '',
      );
      socket.emit('typing:result', result);
    });

    socket.on('disconnect', () => {
      /* Keep player in room for reconnection */
    });
  });
}
