# Wemsic

Real-time multiplayer music quiz for friends. Paste a Spotify playlist and race to name the track.

Each player adds a public Spotify playlist or album link. Wemsic mixes tracks fairly across the room, plays ~30s audio previews, and runs **speed-choice** or **typing** rounds until someone crowns themselves the music nerd.

## Features

- **Two ways to play**
  - **Online** — everyone plays on their own device with their own sound.
  - **Host screen** — one shared screen plays the music and shows the question; phones are answer pads only.
- **Two game modes**
  - **Speed choice** — four options on screen; first correct tap wins the most points.
  - **Typing** — type the artist, song, or both; configurable spelling strictness (normal, hard, lenient).
- **Playlist import** — paste a public Spotify playlist or album URL (minimum 10 tracks). No Spotify login required for players.
- **Fair rotation** — tracks are drawn evenly from each player's library across the game.
- **Live lobby** — room codes, ready states, host settings, kick players, rematch support.
- **Audio previews** — resolved via Spotify embed data when available, with [Deezer](https://developers.deezer.com/) as a fallback. Tracks without a preview are skipped.

## Stack

| Layer | Tech |
|-------|------|
| Web | React 19, TypeScript, MUI, Vite |
| API | Fastify, Socket.io, TypeScript |
| Shared | `@wemsic/shared` — types, scoring, constants |

Monorepo managed with npm workspaces.

## Prerequisites

- **Node.js 20+**
- **npm** (comes with Node)

Spotify Developer credentials are **optional** — only needed if you want the legacy Spotify OAuth endpoints (`/auth/spotify/*`). The current lobby flow imports music by pasting public playlist links.

## Local development

1. **Clone and install**

   ```bash
   git clone <repo-url>
   cd wemsic
   npm install
   ```

2. **Environment (optional)**

   Create a `.env` file at the repo root if you need to override defaults:

   ```env
   # API
   PORT=3001
   WEB_ORIGIN=http://127.0.0.1:5173
   API_PUBLIC_URL=http://127.0.0.1:3001

   # Web (set at build time for production)
   VITE_API_URL=http://127.0.0.1:3001

   # Optional — Spotify OAuth (not required for link-based import)
   SPOTIFY_CLIENT_ID=
   SPOTIFY_CLIENT_SECRET=
   SPOTIFY_REDIRECT_URI=http://127.0.0.1:3001/auth/spotify/callback
   ```

   If you configure Spotify OAuth, add `http://127.0.0.1:3001/auth/spotify/callback` as a redirect URI in the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard). Use `127.0.0.1`, not `localhost` — [Spotify rejects `localhost` redirect URIs](https://developer.spotify.com/documentation/web-api/concepts/redirect_uri).

3. **Start both servers**

   ```bash
   npm run dev
   ```

   Or in separate terminals:

   ```bash
   npm run dev:api   # http://127.0.0.1:3001
   npm run dev:web   # http://127.0.0.1:5173
   ```

4. **Open the web app**

   [http://127.0.0.1:5173](http://127.0.0.1:5173)

   | Port | Service |
   |------|---------|
   | **5173** | React UI — open this in the browser |
   | **3001** | API + WebSockets — JSON at `/`, health at `/health` |

## How to play

1. **Start a game** — pick **Online** or **Host screen**, enter your name, get a 6-character room code.
2. **Invite friends** — they join with the code and their name.
3. **Add music** — each player pastes a public Spotify playlist or album link (at least 10 tracks).
4. **Ready up** — enable sound (online mode or the host screen), then mark yourself ready.
5. **Host starts** — the host picks speed choice or typing mode, adjusts rounds and timing if needed, then starts the game.
6. **Guess** — listen to the preview and answer before the timer runs out. Typing mode lets you keep guessing artist and title separately until time expires.

## Scripts

```bash
npm run dev          # API + web concurrently
npm run dev:api      # API only
npm run dev:web      # Web only
npm run build        # Build shared, API, and web
npm run typecheck    # Typecheck all workspaces
```

## Project structure

```
apps/
  web/                 React frontend (pages, components, Socket.io client)
  api/                 Fastify REST + Socket.io server, playlist scraper, game engine
packages/
  shared/              Shared TypeScript types, scoring logic, game constants
Dockerfile             Production API image
render.yaml            Render blueprint for the API
vercel.json            Vercel build config for the web app
```

## Audio previews

Spotify's Web API no longer reliably exposes `preview_url`. Wemsic:

1. Pulls preview URLs from Spotify embed/pathfinder data when importing a playlist.
2. Falls back to Deezer search by artist + title when a round starts.
3. Skips tracks that have no playable preview anywhere.

Some songs simply won't appear in a game — that's expected.

## Deploy

Wemsic is two deployables:

| Part | Host | Why |
|------|------|-----|
| **Web** (`apps/web`) | **Vercel** | Static Vite SPA |
| **API** (`apps/api`) | **Render / Railway / Fly** | In-memory room state + long-lived Socket.io connections |

Deploy the API first, then point the web app at it.

### API (Render)

A root `Dockerfile` and `render.yaml` blueprint are included.

1. Render → **New → Blueprint** → select this repo, or **New → Web Service → Docker** with the root `Dockerfile`.
2. Set environment variables:
   - `NODE_ENV=production`
   - `WEB_ORIGIN` — your Vercel URL (e.g. `https://wemsic.vercel.app`)
   - `API_PUBLIC_URL` — this service's URL (e.g. `https://wemsic-api.onrender.com`)
   - `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET` (optional)
   - `SPOTIFY_REDIRECT_URI` — `<API_PUBLIC_URL>/auth/spotify/callback` (optional)
3. Health check: `GET /health` → `{ "ok": true }`.

> Run a **single instance**. Rooms and session state live in memory and are not shared across replicas. Free-tier hosts may sleep when idle and wipe rooms on cold start.

### Web (Vercel)

The root `vercel.json` builds the shared package and web app from the monorepo.

1. Vercel → **Add New → Project** → import this repo (root directory).
2. Set `VITE_API_URL` to your API URL from above.
3. Deploy.

`VITE_API_URL` is baked in at build time — changing it requires a redeploy. After both services are live, confirm `WEB_ORIGIN` on the API matches your Vercel domain so CORS and Socket.io connect cleanly.

## License

Private / unlicensed — add a license before distributing.
