import { defineConfig } from 'vite';

// GitHub Pages lives at /raytracing/; Render (and root hosts) set BASE_PATH=/
const base = process.env.BASE_PATH || '/raytracing/';

export default defineConfig({
  base,
  server: {
    port: 5173,
    host: true,
    open: true,
    allowedHosts: true,
  },
  build: {
    target: 'es2020',
    outDir: 'dist',
  },
  preview: {
    // Match Render-style binding when testing production serve locally
    host: true,
    port: Number(process.env.PORT) || 4173,
  },
});
