import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadEnv } from 'dotenv';

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../..',
);
loadEnv({ path: path.join(repoRoot, '.env') });

function optional(name: string, fallback: string): string {
  return process.env[name] ?? fallback;
}

const DEV_WEB_ORIGINS = [
  'http://127.0.0.1:5173',
  'http://localhost:5173',
] as const;

function resolveWebOrigins(): string[] {
  const fromEnv = optional('WEB_ORIGIN', 'http://127.0.0.1:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const origins = [...fromEnv];
  if (process.env.NODE_ENV !== 'production') {
    for (const origin of DEV_WEB_ORIGINS) {
      if (!origins.includes(origin)) origins.push(origin);
    }
  }
  return origins;
}

const webOrigins = resolveWebOrigins();

export const config = {
  port: Number(optional('PORT', '3001')),
  /** Primary web URL (Spotify redirects, API root hint). Use 127.0.0.1, not localhost. */
  webOrigin: webOrigins[0] ?? 'http://127.0.0.1:5173',
  /** Allowed browser origins for CORS and Socket.io */
  webOrigins,
  apiPublicUrl: optional('API_PUBLIC_URL', 'http://127.0.0.1:3001'),
  spotify: {
    clientId: process.env.SPOTIFY_CLIENT_ID ?? '',
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET ?? '',
    redirectUri: optional(
      'SPOTIFY_REDIRECT_URI',
      'http://127.0.0.1:3001/auth/spotify/callback',
    ),
  },
  spotifyConfigured(): boolean {
    return Boolean(this.spotify.clientId && this.spotify.clientSecret);
  },
};
