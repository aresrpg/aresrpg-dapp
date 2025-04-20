import { resolve } from 'path'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueI18n from '@intlify/unplugin-vue-i18n/vite'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import Icons from 'unplugin-icons/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  server: {
    hmr: {
      overlay: false, // Disable the error overlay
      timeout: 5000, // Increase timeout
    },
    watch: {
      usePolling: false,
      useFsEvents: true,
      ignored: ['**/node_modules/**', '**/dist/**'], // Ignore unnecessary files
    },
    fs: {
      strict: false,
    },
  },
  optimizeDeps: {
    include: ['events-polyfill', 'buffer', 'poisson-disk-sampling'],
    exclude: ['@aresrpg/aresrpg-sdk/world', '@aresrpg/aresrpg-world'],
  },
  worker: {
    format: 'es',
  },
  build: {
    target: 'esnext',
    minify: 'esbuild',
    terserOptions: {
      compress: {
        drop_debugger: true,
      },
    },
    rollupOptions: {
      onwarn(warning, warn) {
        if (warning.code === 'EVAL') return
        warn(warning)
      },
      output: {
        assetFileNames: 'assets/[name]-[hash][extname]',
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
      },
    },
    chunkSizeWarningLimit: 3000,
    sourcemap: false,
    assetsInlineLimit: 4096,
    cssCodeSplit: true,
  },
  esbuild: {
    drop: ['debugger'],
    legalComments: 'none',
  },
  plugins: [
    vue(),
    vueI18n({
      runtimeOnly: true,
      compositionOnly: true,
    }),
    nodePolyfills({
      include: [
        'buffer',
        'stream',
        'events',
        'path',
        'timers/promises',
        'util',
        'crypto',
        'process', // Add process
        'os', // Add os
        'child_process', // Add child_process
      ],
      globals: {
        process: true,
        Buffer: true,
      },
      overrides: {
        events: 'events-polyfill',
      },
      protocolImports: true,
    }),
    Icons({
      autoInstall: true,
      compiler: 'vue3',
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
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/\.html$/, /\/api\//],
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 31536000,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|glb|mp3|wav|ogg)$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'assets-cache',
              expiration: {
                maxEntries: 300,
                maxAgeSeconds: 2592000,
              },
            },
          },
        ],
      },
    }),
  ],
})
