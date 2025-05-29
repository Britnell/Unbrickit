// @ts-check
import { defineConfig } from 'astro/config';
import AstroPWA from '@vite-pwa/astro';
import cloudflare from '@astrojs/cloudflare';
import tailwind from '@astrojs/tailwind';

const pwaConfig = AstroPWA({
  injectRegister: 'script',
  registerType: 'autoUpdate',
  devOptions: {
    enabled: true,
    type: 'module',
  },
  workbox: {
    globPatterns: ['**/*.{js,css,html,ico,png,svg,webp}'],
  },
  manifest: {
    name: 'My Awesome App',
    short_name: 'MyApp',
    description: 'My Awesome App description',
    theme_color: '#ffffff',
    icons: [
      {
        src: 'alien.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: 'alien.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  },
});

// https://astro.build/config
export default defineConfig({
  integrations: [pwaConfig, tailwind()],
  adapter: cloudflare(),
});
