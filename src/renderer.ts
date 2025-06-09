import { html } from 'hono/html';

// Template renderer using vite-ssr-components for proper asset handling
export function renderPage(title: string, content: string, jsEntry: string = 'src/index.js') {
  return html`<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <!-- Vite client for HMR in dev -->
    <script type="module" src="/@vite/client"></script>
  </head>
  <body>
    ${content}
    <!-- JS entry point - will be resolved by vite-ssr-components -->
    <script type="module" src="/${jsEntry}"></script>
  </body>
</html>`;
}
