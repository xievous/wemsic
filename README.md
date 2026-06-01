# Wemsic

Real-time multiplayer music quiz. Each player connects Spotify and contributes a playlist they own; the game mixes tracks fairly and runs speed-choice or typing rounds over audio previews.

## Stack

- **Web:** React 19, TypeScript, MUI, Vite
- **API:** Fastify, Socket.io, TypeScript
- **Shared:** `@wemsic/shared` — types, scoring, constants

## Prerequisites

- Node.js 20+
- [Spotify Developer app](https://developer.spotify.com/dashboard) with:
  - Redirect URI (exactly): `http://127.0.0.1:3001/auth/spotify/callback`
  - **Do not use `localhost`** — [Spotify rejects it](https://developer.spotify.com/documentation/web-api/concepts/redirect_uri)
  - Scopes: `playlist-read-private`, `playlist-read-collaborative`
  - App owner on **Premium** (Development Mode requirement as of 2026)
  - Note: Development Mode allows max **5** Spotify users — apply for Extended Quota before public launch.

## Setup

1. Create `.env` at the **repo root** (same folder as `.env.example`):

   ```bash
   cp .env.example .env
   ```

   On Windows (PowerShell), from the `wemsic` folder:

   ```powershell
   Copy-Item .env.example .env
   ```

2. Fill in `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET` in `.env`.

   In the Spotify Dashboard → your app → **Settings** → **Redirect URIs**, add:

   ```
   http://127.0.0.1:3001/auth/spotify/callback
   ```

   Then click **Save**. The value in `.env` must match character-for-character.

3. Install dependencies:

   ```bash
   npm install
   ```

4. Build shared package:

   ```bash
   npm run build -w @wemsic/shared
   ```

5. Start both servers (one command):

   ```bash
   npm run dev
   ```

   Or use **two separate terminals**:

   ```bash
   npm run dev:api
   ```

   ```bash
   npm run dev:web
   ```

   Do **not** combine them on one line like `npm run dev:api npm run dev:web` — that only starts the API.

6. Open the **web app** (not port 3001):

   [http://127.0.0.1:5173](http://127.0.0.1:5173)

   | Port | Service |
   |------|---------|
   | **5173** | React UI — use this in the browser |
   | **3001** | API only — `GET /` returns JSON, not the game |

## How to play

1. **Create game** — get a 6-character room code.
2. **Join** — friends enter the code and their name.
3. **Connect Spotify** — each player links Spotify and picks an owned playlist (minimum 10 tracks).
4. **Ready** — when all players with playlists are ready, the host starts.
5. **Play** — enable sound, answer multiple-choice or typing prompts before time runs out.

## Audio previews

Spotify no longer provides `preview_url` via the Web API. Wemsic resolves ~30s previews via the [Deezer API](https://developers.deezer.com/) using track title and artist. Some tracks may be skipped if no preview is found.

## Deploy (MVP)

- **Web:** Vercel/Netlify — set `VITE_API_URL` to your API URL.
- **API:** Railway/Fly/single VPS — set `WEB_ORIGIN`, `API_PUBLIC_URL`, Spotify vars. Use one instance (in-memory rooms).

## Project structure

```
apps/web     — React frontend
apps/api     — Fastify + Socket.io backend
packages/shared — Shared types and scoring
```

## License

Private / unlicensed — add a license before distributing.
