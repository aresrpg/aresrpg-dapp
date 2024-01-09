import { createRouter, createWebHistory } from 'vue-router';

import e404 from './views/404.vue';
import home from './views/home.vue';
import microsoft_oauth from './views/microsoft.oauth.vue';
import discord_oauth from './views/discord.oauth.vue';
import gtla from './views/gtla.vue';
import inventory from './views/inventory.vue';
import settings from './views/settings.vue';

export default createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/:catchAll(.*)',
      component: e404,
    },
    {
      path: '/',
      redirect: '/inventory',
    },
    {
      path: '/inventory',
      component: home,
      children: [
        {
          name: 'inventory',
          path: 'inventory',
          component: inventory,
        },
        {
          name: 'settings',
          path: 'settings',
          component: settings,
        },
        {
          path: '/minecraft-oauth',
          component: microsoft_oauth,
        },
        {
          path: '/discord-oauth',
          component: discord_oauth,
        },
      ],
    },
    {
      name: 'gtla',
      path: '/gtla/:uuid',
      component: gtla,
    },
  ],
});
