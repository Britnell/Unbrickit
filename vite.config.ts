import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  base: '/Unbrickit/',
  plugins: [
    tanstackStart({
      srcDirectory: './src/react',
      routesDirectory: './src/react/routes',
      generatedRouteTree: './src/react/routeTree.gen.ts',
    }),
    react(),
  ],
});
