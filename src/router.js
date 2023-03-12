import { createRouter, createWebHistory } from 'vue-router';

import e404 from './views/404.vue';
import home from './views/home.vue';
import microsoft_oauth from './views/microsoft.oauth.vue';
import discord_oauth from './views/discord.oauth.vue';
import gtla from './views/gtla.vue';

export default createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/:catchAll(.*)',
      component: e404,
    },
    {
      path: '/',
      component: home,
    },
    {
      path: '/minecraft-oauth',
      component: microsoft_oauth,
    },
    {
      path: '/discord-oauth',
      component: discord_oauth,
    },
    {
      name: 'gtla',
      path: '/gtla/:uuid',
      component: gtla,
    },
  ],
});
