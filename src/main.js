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
import toast from './toast.js'

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

router.onError((error, to) => {
  console.log('router error', error, to)
  if (error.message.includes('Failed to fetch dynamically imported module')) {
    // @ts-ignore
    window.location = to.fullPath
  }
})

vue_app.use(router).use(Vuesax, {}).use(i18n).mount('#app')

let notification = null

registerSW({
  onRegisteredSW(sw_url, registration) {
    console.log('onRegisteredSW')
    // Check for updates every 5 minutes
    if (registration) {
      setInterval(() => {
        registration.update()
      }, 30000)

      registration.addEventListener('updatefound', () => {
        console.log('updatefound')
        const installing_worker = registration.installing
        if (installing_worker) {
          toast.info({
            title: 'Update Available',
            message: 'A new version is being installed.',
            duration: 5000,
          })

          // Listen for state changes on the installing worker
          installing_worker.addEventListener('statechange', () => {
            console.log('statechange', installing_worker.state)
            if (installing_worker.state === 'installed') {
              if (navigator.serviceWorker.controller) {
                // New update is available and waiting to activate
                toast.info({
                  title: 'New Version Ready',
                  message:
                    'A new version is ready. Click the button to update.',
                  duration: 10000,
                  action: {
                    text: 'Update',
                    onClick: () => {
                      installing_worker.postMessage({ type: 'SKIP_WAITING' })
                      window.location.reload()
                    },
                  },
                })
              } else {
                // No previous service worker, this is the first install
                toast.info({
                  title: 'App Ready',
                  message: 'The app is ready to be used offline.',
                  duration: 5000,
                })
              }
            }
          })
        }
      })
    }
  },
  onRegistered(r) {
    console.log('onRegistered', r)
  },
  onUpdateFound() {
    console.log('onUpdateFound')
    if (!notification) {
      notification = toast.tx(
        'A new version is available and is being installed.',
        'Update Available',
      )
    } else {
      notification.update(
        'loading',
        'A new version is installing...',
        'Update Available',
      )
    }
  },
  onNeedRefresh() {
    console.log('onNeedRefresh')
    // Show a notification that a new version is being installed
    if (notification) {
      notification.update(
        'loading',
        'A new version is installing...',
        'Update Available',
      )
    } else {
      notification = toast.tx(
        'A new version is installing...',
        'Update Available',
      )
    }
  },
  onUpdated(registration) {
    console.log('onUpdated')
    if (notification) {
      notification.update(
        'success',
        'A new version is ready. Click the button to update.',
        'Update Ready',
      )

      // Show a button to reload the page and activate the new service worker
      const button = document.createElement('button')
      button.innerText = 'Update'
      button.onclick = () => {
        if (registration.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' })
          window.location.reload()
        }
      }
      document.body.appendChild(button) // Adjust this to integrate with your UI as necessary
    } else {
      const notification = toast.tx(
        'A new version is available.',
        'Update Ready',
      )
      notification.update(
        'success',
        'A new version is ready. Click the button to update.',
        'Update Ready',
      )

      // Show a button to reload the page and activate the new service worker
      const button = document.createElement('button')
      button.innerText = 'Update'
      button.onclick = () => {
        if (registration.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' })
          window.location.reload()
        }
      }
      document.body.appendChild(button) // Adjust this to integrate with your UI as necessary
    }
  },
  onOfflineReady() {
    toast.success('The app is ready to be used offline.', 'Offline Ready')
  },
  onError(error) {
    toast.error(`Service worker error: ${error}`, 'Error')
  },
})
