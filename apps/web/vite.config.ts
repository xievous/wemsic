import path from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv, type Plugin } from 'vite';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

/**
 * Link-preview tags need an absolute image URL. VITE_SITE_URL sets the site's
 * address; on Vercel the production domain is used when it isn't set. With
 * neither, the path stays relative, which some apps still follow.
 */
function siteUrl(env: Record<string, string>): Plugin {
  const vercel = env.VERCEL_PROJECT_PRODUCTION_URL;
  const url = (env.VITE_SITE_URL || (vercel ? `https://${vercel}` : '')).replace(/\/$/, '');
  return {
    name: 'wemsic-site-url',
    transformIndexHtml: {
      order: 'pre',
      handler: (html) => html.replaceAll('%SITE_URL%', url),
    },
  };
}

export default defineConfig(({ mode }) => ({
  envDir: repoRoot,
  // The '' prefix loads every variable, not just VITE_ ones, so Vercel's own count too.
  plugins: [react(), siteUrl(loadEnv(mode, repoRoot, ''))],
  server: {
    host: '127.0.0.1',
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
}));
