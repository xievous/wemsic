import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import Fastify from 'fastify';
import { Server } from 'socket.io';
import { config } from './config.js';
import { RoomManager } from './rooms/RoomManager.js';
import { registerSocketHandlers } from './socket/handlers.js';
import {
  consumePkceSession,
  exchangeCode,
  fetchUserPlaylists,
  getLoginUrl,
  getSpotifyTokens,
  setSpotifyTokens,
  SpotifyError,
  storePkceSession,
} from './spotify/client.js';
import { ScrapeError, parseMusicLink, playlistSourceKey, scrapeMusicFromLink, toYouTubeBrowseId } from './music/scraper.js';
import { getPresetCatalog } from './catalog/presets.js';
import { searchCatalog } from './catalog/search.js';
import {
  generateCodeChallenge,
  generateCodeVerifier,
  generateState,
} from './spotify/pkce.js';

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

await fastify.register(cookie);

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

async function createRoomWithHostHandler(request: {
  body?: { displayName?: string; roomType?: string };
}) {
  const displayName = request.body?.displayName?.trim() || 'Host';
  const roomType = request.body?.roomType === 'host' ? 'host' : 'online';
  const created = roomManager.createRoom(displayName, roomType);
  return {
    roomCode: created.roomCode,
    playerId: created.playerId,
    hostPlayerId: created.hostPlayerId,
  };
}

fastify.post<{ Body: { displayName: string; roomType?: string } }>(
  '/rooms/create-with-host',
  createRoomWithHostHandler,
);

fastify.post<{
  Params: { code: string };
  Body: { displayName: string; roomType?: string };
}>('/rooms/:code/create-with-host', createRoomWithHostHandler);

fastify.get('/auth/spotify/login', async (request, reply) => {
  if (!config.spotifyConfigured()) {
    return reply.status(503).send({ error: 'Spotify not configured' });
  }
  const { playerId, roomCode } = request.query as {
    playerId?: string;
    roomCode?: string;
  };
  if (!playerId || !roomCode) {
    return reply.status(400).send({ error: 'Missing playerId or roomCode' });
  }

  const verifier = generateCodeVerifier();
  const challenge = generateCodeChallenge(verifier);
  const state = generateState();
  storePkceSession(state, verifier, playerId, roomCode);

  const url = getLoginUrl(state, challenge);
  return reply.redirect(url);
});

fastify.get('/auth/spotify/callback', async (request, reply) => {
  const { code, state, error } = request.query as {
    code?: string;
    state?: string;
    error?: string;
  };

  if (error) {
    return reply.redirect(`${config.webOrigin}/lobby?spotify=error`);
  }

  const session = state ? consumePkceSession(state) : null;
  if (!session || !code) {
    return reply.redirect(`${config.webOrigin}/lobby?spotify=error`);
  }

  try {
    const tokens = await exchangeCode(code, session.verifier);
    setSpotifyTokens(session.playerId, tokens);
    roomManager.setSpotifyConnected(session.roomCode, session.playerId, true);
    return reply.redirect(
      `${config.webOrigin}/lobby/${session.roomCode}?spotify=connected&playerId=${session.playerId}`,
    );
  } catch {
    return reply.redirect(`${config.webOrigin}/lobby?spotify=error`);
  }
});

fastify.get<{ Querystring: { playerId: string } }>(
  '/spotify/playlists',
  async (request, reply) => {
    const { playerId } = request.query;
    if (!playerId || !getSpotifyTokens(playerId)) {
      return reply.status(401).send({ error: 'Spotify not connected' });
    }
    try {
      const playlists = await fetchUserPlaylists(playerId);
      return { playlists };
    } catch (e) {
      if (e instanceof SpotifyError) {
        return reply.status(e.status ?? 502).send({ error: e.message });
      }
      return reply
        .status(500)
        .send({ error: 'Could not load your playlists. Please try again.' });
    }
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
    const { tracks, sourceName, truncated } = await scrapeMusicFromLink(
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
    const saved = roomManager.setPlaylist(
      request.params.code,
      playerId,
      parsedLink ? playlistSourceKey(parsedLink, source) : source.slice(0, 64),
      sourceName,
      tracks,
    );
    if (!saved) {
      return reply.status(404).send({ error: 'Player not found in this room. Try rejoining.' });
    }
    return {
      trackCount: tracks.length,
      playlistName: sourceName,
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
