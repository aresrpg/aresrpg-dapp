import { createApp } from 'vue'
import { inject } from '@vercel/analytics'
import 'vuesax-alpha/dist/index.css'
import 'vuesax-alpha/theme-chalk/dark/css-vars.css'
import Vuesax from 'vuesax-alpha'
import '@imengyu/vue3-context-menu/lib/vue3-context-menu.css'
// patch kiosk rules
import { registerStashedWallet } from '@mysten/zksend'
// @ts-ignore
import { registerSW } from 'virtual:pwa-register'

import app from './app.vue'
import router from './router.js'
import { i18n } from './i18n.js'

inject()
registerStashedWallet('AresRPG', { origin: 'https://getstashed.com' })

console.log(
  "%c You're curious, I like you 🤭🍑",
  'color: #1565C0;font-weight:bold;font-size:22px;',
)
console.log(
  "%c but don't bother, i'm open-source!",
  'color: #E67E22;font-size:18px;',
)
console.log('%c https://github.com/aresrpg/aresrpg-dapp', 'font-size:15px;')

const vue_app = createApp(app)

vue_app.use(router).use(Vuesax, {}).use(i18n).mount('#app')

registerSW({
  onNeedRefresh() {
    console.log('onNeedRefresh')
    // Show a toast notification to the user that a new version is installing
    // toast.show({
    //   title: 'Update Available',
    //   message: 'A new version is available and is being installed.',
    //   duration: 5000,
    // })
  },
  onOfflineReady() {
    console.log('onOfflineReady.')
    // You can show a toast notification that the app is ready to be used offline
    // toast.show({
    //   title: 'Offline Ready',
    //   message: 'The app is ready to be used offline.',
    //   duration: 5000,
    // })
  },
  onRegisteredSW(sw_url, registration) {
    console.log('onRegisteredSW:', sw_url)
    // Registration was successful
    if (registration) {
      setInterval(
        () => {
          registration.update()
        },
        10 * 60 * 1000,
      ) // Check for updates every hour
    }
  },
  onRegistered(r) {
    // Registration complete
    console.log('onRegistered:', r)
  },
  onUpdateFound() {
    // A new update is found
    console.log('onUpdateFound')
  },
  onUpdated(registration) {
    console.log('onUpdated')
    // New update ready to be applied
    // toast.show({
    //   title: 'New Version Ready',
    //   message: 'A new version is ready. Click the button to update.',
    //   duration: 10000,
    //   action: {
    //     text: 'Update',
    //     onClick: () => {
    //       registration.waiting.postMessage({ type: 'SKIP_WAITING' })
    //       window.location.reload()
    //     },
    //   },
    // })
  },
})
