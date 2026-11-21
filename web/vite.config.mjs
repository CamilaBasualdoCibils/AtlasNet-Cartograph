import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { runtimeMiddleware } from './scripts/runtime-middleware.mjs';

function serveRuntimeConfig(server) {
  server.middlewares.use(runtimeMiddleware());
}

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'cartograph-runtime-config',
      configureServer: serveRuntimeConfig,
      configurePreviewServer: serveRuntimeConfig,
    },
  ],
});
