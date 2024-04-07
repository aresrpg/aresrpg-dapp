import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueI18n from '@intlify/unplugin-vue-i18n/vite'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import Icons from 'unplugin-icons/vite'

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    target: 'esnext',
  },
  plugins: [
    vue(),
    vueI18n({}),
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
  ],
})
