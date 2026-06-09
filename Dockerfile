# Builds and runs the Wemsic API (Fastify + Socket.io).
# The web app deploys separately to Vercel; this image is for a persistent
# host (Railway / Render / Fly) because the API holds in-memory room state
# and long-lived WebSocket connections.
#
# Build context must be the repo root (monorepo workspaces).

# syntax=docker/dockerfile:1

FROM node:20-alpine AS build
WORKDIR /app

# Install all workspace deps using only the manifests first (better caching).
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm install

# Build the shared package, then the API.
COPY . .
RUN npm run build -w @wemsic/shared && npm run build -w @wemsic/api

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Install production deps for the API workspace only (pulls in @wemsic/shared).
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm install --omit=dev -w @wemsic/api

# Copy compiled output.
COPY --from=build /app/packages/shared/dist packages/shared/dist
COPY --from=build /app/apps/api/dist apps/api/dist

EXPOSE 3001
CMD ["node", "apps/api/dist/index.js"]
