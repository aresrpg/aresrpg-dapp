import { createApp } from 'vue';
import { registerSW } from 'virtual:pwa-register';
import { createI18n } from 'vue-i18n';
import { inject } from '@vercel/analytics';
import Vuesax from 'vuesax-alpha';
import 'vuesax-alpha/dist/index.css';
import 'vuesax-alpha/theme-chalk/dark/css-vars.css';

import app from './app.vue';
import router from './router.js';
import toast from './toast.js';

inject();

console.log(
  `%c You're curious, I like you 🤭🍑`,
  'color: #1565C0;font-weight:bold;font-size:22px;',
);
console.log(
  "%c but don't bother, i'm open-source!",
  'color: #E67E22;font-size:18px;',
);
console.log('%c https://github.com/aresrpg/dapp', 'font-size:15px;');

const vue_app = createApp(app);

export const i18n = createI18n({
  legacy: false,
  locale: 'en',
  allowComposition: true, // you need to specify that!
  messages: {
    fr: {
      user_not_found: 'Utilisateur manquant, reconnecte-toi',
      discord_already_linked: 'Ce discord est déjà lié à un autre compte',
      minecraft_already_linked:
        'Ce compte Microsoft est déjà lié à un autre compte',
      discord_not_linked: "Tu dois d'abord lier ton compte Discord",
      zealy_not_linked: "Aucun compte Zealy n'est lié au compte discord",
      minecraft_not_owned:
        'Tu ne possèdes pas Minecraft sur ce compte Microsoft',
      minecraft_not_linked: "Tu dois d'abord lier ton compte Microsoft",
      captcha_failed: 'Captcha invalide, réessayez',
      not_la: `Tu n'etait pas sur la v1`,
      refresh_too_soon: 'Attend un peu avant de rafraichir',
      unlink_last_provider: 'Tu ne peux pas retirer ton dernier compte',
    },
    en: {
      user_not_found: 'User not found, please login again',
      discord_already_linked:
        'This discord account is already linked to another account',
      minecraft_already_linked: 'This Microsoft account is already linked',
      discord_not_linked: 'You must connect your Discord account first',
      zealy_not_linked: 'No Zealy account linked to this discord account',
      minecraft_not_owned: 'You do not own Minecraft on this Microsoft account',
      minecraft_not_linked: 'You must connect your Microsoft account first',
      captcha_failed: 'Invalid captcha, please retry',
      not_la: `You weren't on v1`,
      refresh_too_soon: 'Wait a bit before refreshing',
      unlink_last_provider: "You can't unlink your last account",
    },
  },
});

vue_app.use(router).use(Vuesax, {}).use(i18n).mount('#app');

const updateSW = registerSW({
  onOfflineReady() {
    toast.info('ready to work offline!', 'Browser');
  },
});
