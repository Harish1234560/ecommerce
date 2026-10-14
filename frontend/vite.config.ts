import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiTarget = env.VITE_API_PROXY ?? 'http://localhost:4000';
  const proxied = { target: apiTarget, changeOrigin: false };

  return {
    plugins: [react()],
    resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
    server: {
      port: 5173,
      // Same-origin in development: the browser talks to Vite, Vite forwards to the API.
      proxy: { '/api': proxied, '/uploads': proxied, '/sitemap.xml': proxied, '/robots.txt': proxied },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            react: ['react', 'react-dom', 'react-router-dom'],
            query: ['@tanstack/react-query', 'zustand'],
            motion: ['framer-motion'],
            charts: ['recharts'],
          },
        },
      },
    },
  };
});
