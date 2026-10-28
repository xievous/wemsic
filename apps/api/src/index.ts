import cors from '@fastify/cors';
import Fastify from 'fastify';
import { Server } from 'socket.io';
import { config } from './config.js';
import { RoomManager } from './rooms/RoomManager.js';
import { registerSocketHandlers } from './socket/handlers.js';
import { ScrapeError, parseMusicLink, playlistSourceKey, scrapeMusicFromLink, toYouTubeBrowseId } from './music/scraper.js';
import { getPresetCatalog } from './catalog/presets.js';
import { searchCatalog } from './catalog/search.js';

const fastify = Fastify({ logger: true });

await fastify.register(cors, {
  origin: (origin, cb) => {
    if (!origin || config.webOrigins.includes(origin)) {
      cb(null, true);
    } else {
      cb(new Error('Not allowed by CORS'), false);
    }
  },
  credentials: true,
});

const io = new Server(fastify.server, {
  cors: { origin: config.webOrigins, credentials: true },
});

const roomManager = new RoomManager((roomCode, event, payload) => {
  io.to(`room:${roomCode}`).emit(event, payload);
});

registerSocketHandlers(io, roomManager);

fastify.get('/health', async () => ({ ok: true }));

fastify.get('/', async () => ({
  name: 'Wemsic API',
  message: 'This is the backend only. Open the web app in your browser.',
  webApp: config.webOrigin,
  health: '/health',
}));

fastify.post<{ Params: { code: string }; Body: { displayName: string } }>(
  '/rooms/:code/join',
  async (request) => {
    const displayName = request.body?.displayName?.trim();
    if (!displayName || displayName.length < 1 || displayName.length > 24) {
      return { error: 'Invalid display name' };
    }
    const result = roomManager.joinRoom(request.params.code, displayName);
    if ('error' in result) return { error: result.error };
    return { playerId: result.playerId, roomCode: request.params.code.toUpperCase() };
  },
);

fastify.get<{ Params: { code: string } }>('/rooms/:code', async (request) => {
  const state = roomManager.getLobbyState(request.params.code);
  if (!state) return { error: 'Room not found' };
  return state;
});

fastify.post<{ Body: { displayName: string; roomType?: string } }>(
  '/rooms/create-with-host',
  async (request) => {
    const displayName = request.body?.displayName?.trim() || 'Host';
    const roomType = request.body?.roomType === 'host' ? 'host' : 'online';
    const created = roomManager.createRoom(displayName, roomType);
    return {
      roomCode: created.roomCode,
      playerId: created.playerId,
      hostPlayerId: created.hostPlayerId,
    };
  },
);

fastify.get('/catalog/presets', async () => getPresetCatalog());

fastify.get<{ Querystring: { q?: string } }>('/catalog/search', async (request, reply) => {
  const q = request.query.q?.trim();
  if (!q) {
    return reply.status(400).send({ error: 'Missing search query' });
  }
  if (q.length > 64) {
    return reply.status(400).send({ error: 'Query too long' });
  }

  const results = await searchCatalog(q);
  return { results };
});

fastify.post<{
  Params: { code: string };
  Body: { playerId: string; playlistId?: string; url?: string; ytmBrowseId?: string };
}>('/rooms/:code/playlists', async (request, reply) => {
  const { playerId, playlistId, url, ytmBrowseId } = request.body ?? {};
  const source =
    url ??
    playlistId ??
    (ytmBrowseId
      ? `https://music.youtube.com/browse/${toYouTubeBrowseId(ytmBrowseId)}`
      : undefined);
  if (!playerId || !source) {
    return reply.status(400).send({ error: 'Missing fields' });
  }

  try {
    const roomCode = request.params.code.toUpperCase();
    const { tracks, sourceName, thumbnailUrl, truncated } = await scrapeMusicFromLink(
      source,
      playerId,
      (progress) => {
        io.to(`room:${roomCode}`).emit('playlist:import:progress', {
          playerId,
          ...progress,
        });
      },
    );
    const parsedLink = parseMusicLink(source);
    const playlistId = parsedLink ? playlistSourceKey(parsedLink, source) : source.slice(0, 64);
    const saved = roomManager.addPlaylist(
      request.params.code,
      playerId,
      playlistId,
      sourceName,
      thumbnailUrl ?? null,
      tracks,
    );
    if (!saved) {
      return reply.status(404).send({ error: 'Player not found in this room. Try rejoining.' });
    }
    const lobby = roomManager.getLobbyState(roomCode);
    const player = lobby?.players.find((p) => p.id === playerId);
    return {
      playlistId,
      trackCount: tracks.length,
      totalTrackCount: player?.trackCount ?? tracks.length,
      playlistName: sourceName,
      thumbnailUrl: thumbnailUrl ?? tracks[0]?.albumArtUrl ?? null,
      truncated: truncated ?? false,
    };
  } catch (e) {
    const message =
      e instanceof ScrapeError
        ? e.message
        : e instanceof Error
          ? e.message
          : String(e);
    return reply.status(400).send({ error: message });
  }
});

fastify.delete<{
  Params: { code: string; playlistId: string };
  Body: { playerId: string };
}>('/rooms/:code/playlists/:playlistId', async (request, reply) => {
  const { playerId } = request.body ?? {};
  if (!playerId) {
    return reply.status(400).send({ error: 'Missing playerId' });
  }

  const removed = roomManager.removePlaylist(
    request.params.code,
    playerId,
    decodeURIComponent(request.params.playlistId),
  );
  if (!removed) {
    return reply.status(404).send({ error: 'Playlist not found' });
  }
  return { ok: true };
});

fastify.post<{ Body: { roomCode: string; playerId: string } }>(
  '/rooms/reconnect',
  async (request) => {
    const { roomCode, playerId } = request.body ?? {};
    if (!roomCode || !playerId) return { error: 'Missing fields' };
    const result = roomManager.reconnectPlayer(roomCode, playerId);
    if ('error' in result) return result;
    return result;
  },
);

try {
  await fastify.listen({ port: config.port, host: '0.0.0.0' });
  console.log(`API listening on http://localhost:${config.port}`);
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
