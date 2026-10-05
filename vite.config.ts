import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  base: '/Unbrickit/',
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        react: 'react.html',
      },
    },
  },
});
