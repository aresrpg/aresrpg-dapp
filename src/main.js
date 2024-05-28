import { createApp } from 'vue'
import { createI18n } from 'vue-i18n'
import { inject } from '@vercel/analytics'
import 'vuesax-alpha/dist/index.css'
import 'vuesax-alpha/theme-chalk/dark/css-vars.css'
import Vuesax from 'vuesax-alpha'

import '@imengyu/vue3-context-menu/lib/vue3-context-menu.css'
// patch kiosk rules
import app from './app.vue'
import router from './router.js'
import { error_translations } from './core/game/error_handler.js'
import { error_sui } from './core/sui/client.js'

inject()

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

export const i18n = createI18n({
  legacy: false,
  locale: 'en',
  allowComposition: true, // you need to specify that!
  messages: {
    fr: {
      ...error_translations.fr,
      ...error_sui.fr,
      sign_message:
        '[AresRPG] Ceci est un message de vérification pour prouver que vous possédez cette adresse. Il vous permettra de vous connecter au serveur',
    },
    en: {
      ...error_translations.en,
      ...error_sui.en,
      sign_message:
        '[AresRPG] This is a verification message to prove that you own this address. It will allow you to connect to the server',
    },
  },
})

router.onError(error => {
  if (error.message.includes('Failed to load module script')) {
    window.location.reload()
  }
})

vue_app.use(router).use(Vuesax, {}).use(i18n).mount('#app')
