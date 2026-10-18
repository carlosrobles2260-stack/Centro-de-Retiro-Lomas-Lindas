import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'ERP Centro de Retiro Lomas Lindas',
        short_name: 'Lomas Lindas',
        description: 'Gestión administrativa y de seguridad del Centro de Retiro Lomas Lindas',
        lang: 'es',
        theme_color: '#2f6e4f',
        background_color: '#2f6e4f',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // No cachear las llamadas a la API (siempre datos frescos / autenticación).
        navigateFallbackDenylist: [/^\/api/],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/api'),
            handler: 'NetworkOnly',
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  server: {
    port: 5173,
    // Redirige las llamadas /api y la página pública de credencial al backend.
    proxy: {
      '/api': 'http://localhost:4000',
      '/credencial': 'http://localhost:4000',
    },
  },
});
