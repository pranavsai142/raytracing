import { defineConfig } from 'vite';

export default defineConfig({
  base: '/raytracing/',
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
});