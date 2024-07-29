import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueI18n from '@intlify/unplugin-vue-i18n/vite'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import Icons from 'unplugin-icons/vite'
import { VitePWA } from 'vite-plugin-pwa'
import ViteYaml from '@modyfi/vite-plugin-yaml'

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    target: 'esnext',
  },
  plugins: [
    vue(),
    vueI18n({}),
    ViteYaml(),
    nodePolyfills({
      // To add only specific polyfills, add them here. If no option is passed, adds all polyfills
      include: ['stream', 'events', 'path', 'timers/promises', 'util'],
      overrides: {
        events: 'events-polyfill',
      },
      // Whether to polyfill `node:` protocol imports.
      protocolImports: true,
    }),
    Icons({
      // experimental
      autoInstall: true,
    }),
    VitePWA({
      includeAssets: [
        'favicon.ico',
        'robots.txt',
        '*.png',
        '*.jpg',
        '*.svg',
        '*.gif',
        '*.glb',
        '*.mp3',
        '*.wav',
        '*.ogg',
      ],
      registerType: 'prompt',
      workbox: {
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/\.html$/, /\/api\//],
        cleanupOutdatedCaches: true,
        // Exclude HTML files from being cached
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // <== 365 days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // <== 365 days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          // New caching rule for assets
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|glb|mp3|wav|ogg)$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'assets-cache',
              expiration: {
                maxEntries: 300,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
            },
          },
        ],
      },
    }),
  ],
})
