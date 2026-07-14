import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon-192.png', 'icons/icon-512.png'],
      manifest: {
        name: 'English Flow — Personal AI English Coach',
        short_name: 'English Flow',
        description:
          'Персональный ИИ-тренер английского языка: короткие ежедневные занятия, разговорная практика и интервальное повторение.',
        lang: 'ru',
        start_url: '/',
        display: 'standalone',
        background_color: '#0f172a',
        theme_color: '#1e3a8a',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            // Кэш GET-запросов ядра обучения для офлайн-повторения
            urlPattern: ({ url, request }) =>
              request.method === 'GET' &&
              url.pathname.startsWith('/api/') &&
              [
                '/api/users/me',
                '/api/plans/today',
                '/api/phrases',
                '/api/phrases/categories',
                '/api/phrases/of-the-day',
                '/api/reviews/queue',
                '/api/lessons',
                '/api/lessons/today',
                '/api/errors',
                '/api/errors/practice',
                '/api/progress',
                '/api/conversations/scenarios',
              ].some((p) => url.pathname === p || url.pathname.startsWith(p)),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'ef-api-cache',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 100, maxAgeSeconds: 7 * 24 * 3600 },
              cacheableResponse: { statuses: [200] },
            },
          },
        ],
      },
    }),
  ],
  server: {
    port: 5175,
    proxy: {
      '/api': {
        target: process.env.VITE_PROXY_TARGET ?? 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
