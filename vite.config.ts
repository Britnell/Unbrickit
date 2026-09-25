import { cloudflare } from '@cloudflare/vite-plugin';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  // plugins: [cloudflare()],
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        app: 'app.html',
        react: 'react.html',
      },
    },
  },
});
