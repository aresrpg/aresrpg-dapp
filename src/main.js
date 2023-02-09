import { createApp, provide } from 'vue';
import { registerSW } from 'virtual:pwa-register';
import Toast, { useToast } from 'vue-toastification';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import { library } from '@fortawesome/fontawesome-svg-core';
import { faAngleDown } from '@fortawesome/free-solid-svg-icons';
import 'vue-toastification/dist/index.css';
import { createI18n } from 'vue-i18n';

import app from './app.vue';
import router from './router.js';

console.log(
  `%c You're curious, I like you 🤭🍑`,
  'color: #1565C0;font-weight:bold;font-size:22px;'
);
console.log(
  "%c but don't bother, i'm open-source!",
  'color: #E67E22;font-size:18px;'
);
console.log('%c https://github.com/aresrpg/app', 'font-size:15px;');

const vue_app = createApp(app);
const toast = useToast();
export const i18n = createI18n({
  locale: 'fr',
  allowComposition: true, // you need to specify that!
  messages: {
    fr: {
      user_not_found: 'Utilisateur manquant, reconnecte-toi',
      discord_already_linked: 'Ce discord est déjà lié à un autre compte',
      minecraft_not_owned:
        'Tu ne possèdes pas Minecraft sur ce compte Microsoft',
    },
    en: {
      user_not_found: 'User not found, please login again',
      discord_already_linked:
        'This discord account is already linked to another account',
      minecraft_not_owned: `You don't own Minecraft on this Microsoft account`,
    },
  },
});

library.add(faAngleDown);

vue_app
  .use(router)
  .component('fa', FontAwesomeIcon)
  .use(Toast, { position: 'bottom-left' })
  .use(i18n)
  .mount('#app');

const updateSW = registerSW({
  onOfflineReady() {
    toast('ready to work offline!');
  },
});

vue_app.config.compilerOptions.isCustomElement = tag => {
  if (tag.startsWith('el-')) return true;
  if (tag.startsWith('upload-')) return true;
  return false;
};
