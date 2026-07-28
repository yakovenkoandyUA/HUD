import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import svgr from 'vite-plugin-svgr'
import { sentryVitePlugin } from '@sentry/vite-plugin'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules/react-dom')) return 'react-dom'
          if (id.includes('node_modules/')) return 'vendor'
        },
      },
    },
  },
  plugins: [
    react(),
    svgr(),
    ...(process.env.SENTRY_AUTH_TOKEN ? [sentryVitePlugin({ org: 'mimir-hud', project: 'mimir-client' })] : []),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      injectManifest: {
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5 МБ
      },
      manifest: {
        name: 'MIMIR',
        short_name: 'MIMIR',
        description: 'Your personal organizer. Drink deep.',
        start_url: '/',
        scope: '/',
        theme_color: '#0d0d0d',
        background_color: '#0d0d0d',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          { src: '/icons/icon-72.png',  sizes: '72x72',   type: 'image/png' },
          { src: '/icons/icon-96.png',  sizes: '96x96',   type: 'image/png' },
          { src: '/icons/icon-128.png', sizes: '128x128', type: 'image/png' },
          { src: '/icons/icon-144.png', sizes: '144x144', type: 'image/png' },
          { src: '/icons/icon-152.png', sizes: '152x152', type: 'image/png' },
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-192-maskable.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: '/icons/icon-384.png', sizes: '384x384', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        shortcuts: [
          {
            name: 'Фінанси',
            short_name: 'Фінанси',
            description: 'Відкрити фінанси',
            url: '/finance',
            icons: [{ src: '/icons/shortcuts/finance.svg', sizes: '96x96', type: 'image/svg+xml' }],
          },
          {
            name: 'Новий спогад',
            short_name: 'Спогад',
            description: 'Додати новий спогад',
            url: '/memories',
            icons: [{ src: '/icons/shortcuts/memory.svg', sizes: '96x96', type: 'image/svg+xml' }],
          },
          {
            name: 'Задачі',
            short_name: 'Задачі',
            description: 'Відкрити спринт',
            url: '/sprint',
            icons: [{ src: '/icons/shortcuts/sprint.svg', sizes: '96x96', type: 'image/svg+xml' }],
          },
          {
            name: 'Головна',
            short_name: 'Головна',
            description: 'Дашборд',
            url: '/',
            icons: [{ src: '/icons/shortcuts/dashboard.svg', sizes: '96x96', type: 'image/svg+xml' }],
          },
        ],
      },
    }),
  ],
})