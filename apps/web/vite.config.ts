import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, './src') },
  },
  server: {
    // Same prefix as the nginx proxy in prod, so the api needs no CORS
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        rewrite: (url) => url.replace(/^\/api/, ''),
      },
    },
  },
});
