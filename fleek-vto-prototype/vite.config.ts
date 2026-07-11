import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Supplier Studio backend (FastAPI): catalogue, image storage, Gemini
      '/api': { target: 'http://localhost:8000', changeOrigin: true },
    },
  },
});
