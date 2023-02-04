import { createApp, provide } from 'vue';
import { registerSW } from 'virtual:pwa-register';
import Toast, { useToast } from 'vue-toastification';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import { library } from '@fortawesome/fontawesome-svg-core';
import { faAngleDown } from '@fortawesome/free-solid-svg-icons';
import 'vue-toastification/dist/index.css';

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

library.add(faAngleDown);

vue_app
  .use(router)
  .component('fa', FontAwesomeIcon)
  .use(Toast, { position: 'bottom-left' })
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
