import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueI18n from '@intlify/unplugin-vue-i18n/vite'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import Icons from 'unplugin-icons/vite'
import { VitePWA } from 'vite-plugin-pwa'
import ViteYaml from '@modyfi/vite-plugin-yaml'

export default defineConfig({
  server: {
    watch: {
      usePolling: true,
      interval: 100,
    },
  },
  optimizeDeps: {
    include: ['events-polyfill'],
  },
  build: {
    target: 'esnext',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
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
    chunkSizeWarningLimit: 2000,
    sourcemap: false,
    assetsInlineLimit: 4096,
    cssCodeSplit: true,
  },
  esbuild: {
    drop: ['console', 'debugger'],
    legalComments: 'none',
  },
  plugins: [
    vue(),
    vueI18n({
      runtimeOnly: true,
      compositionOnly: true,
    }),
    ViteYaml(),
    nodePolyfills({
      include: [
        'stream',
        'events',
        'path',
        'timers/promises',
        'util',
        'crypto',
      ],
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
