import { createApp } from 'vue'
import { inject } from '@vercel/analytics'
import 'vuesax-alpha/dist/index.css'
import 'vuesax-alpha/theme-chalk/dark/css-vars.css'
import Vuesax from 'vuesax-alpha'

import '@imengyu/vue3-context-menu/lib/vue3-context-menu.css'
// patch kiosk rules
import app from './app.vue'
import router from './router.js'
import { i18n } from './i18n.js'

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

vue_app.use(router).use(Vuesax, {}).use(i18n).mount('#app')
