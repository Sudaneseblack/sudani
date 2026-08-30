import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  server: {
    host: '0.0.0.0',
    port: 5000
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
});
