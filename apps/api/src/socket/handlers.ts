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
      roomCode = payload.roomCode.toUpperCase();
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
      }) => {
        if (!roomCode || !playerId) return;
        roomManager.updateSettings(roomCode, playerId, payload);
      },
    );

    socket.on('host:start', async () => {
      if (!roomCode || !playerId) return;
      const err = await roomManager.startGame(roomCode, playerId);
      if (err) socket.emit('error', { message: err });
    });

    socket.on('answer:submit', (payload: { answer: unknown }) => {
      if (!roomCode || !playerId) return;
      const ok = roomManager.submitAnswer(roomCode, playerId, payload.answer);
      if (!ok) socket.emit('error', { message: 'Could not submit answer' });
      else socket.emit('answer:ack', { ok: true });
    });

    socket.on('disconnect', () => {
      /* Keep player in room for reconnection; session TTL handled by room lifecycle */
    });
  });
}
