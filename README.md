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

## Deploy

Wemsic is split into two deployables:

| Part | Host | Why |
|------|------|-----|
| **Web** (`apps/web`) | **Vercel** | Static Vite SPA — ideal for Vercel. |
| **API** (`apps/api`) | **Railway / Render / Fly** | Holds **in-memory room state** and long-lived **Socket.io** connections, so it needs a single persistent server. It cannot run on Vercel serverless functions. |

Deploy the API first so you have its URL for the web app's `VITE_API_URL`.

### 1. API — persistent host (Render example)

A `Dockerfile` (repo root) and `render.yaml` blueprint are included.

1. Render → **New → Blueprint** → select this repo (uses `render.yaml`), or **New → Web Service → Docker** pointing at the root `Dockerfile`.
2. Set environment variables:
   - `NODE_ENV=production`
   - `WEB_ORIGIN` — your Vercel URL (e.g. `https://wemsic.vercel.app`)
   - `API_PUBLIC_URL` — this service's URL (e.g. `https://wemsic-api.onrender.com`)
   - `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`
   - `SPOTIFY_REDIRECT_URI` — `<API_PUBLIC_URL>/auth/spotify/callback`
3. In the Spotify Dashboard, add that exact redirect URI to your app.
4. Health check: `GET /health` → `{ "ok": true }`.

> Run a **single instance** — rooms and Spotify tokens live in memory and are not shared across replicas.

### 2. Web — Vercel

The repo includes a root `vercel.json` that builds the shared package and the web app from the monorepo.

1. Vercel → **Add New → Project** → import this repo.
2. Keep the **Root Directory** as the repo root (the root `vercel.json` handles the build).
3. Add an environment variable:
   - `VITE_API_URL` — your API URL from step 1 (e.g. `https://wemsic-api.onrender.com`)
4. Deploy. Vercel runs `npm run build -w @wemsic/shared && npm run build -w @wemsic/web` and serves `apps/web/dist` with SPA routing.

`VITE_API_URL` is baked in at build time, so changing it requires a redeploy. After both are live, double-check `WEB_ORIGIN` on the API matches the Vercel domain so CORS and Socket.io connect.

## Project structure

```
apps/web     — React frontend
apps/api     — Fastify + Socket.io backend
packages/shared — Shared types and scoring
```

## License

Private / unlicensed — add a license before distributing.
