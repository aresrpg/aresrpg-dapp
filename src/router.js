import { createRouter, createWebHistory } from 'vue-router'

import home from './views/home.vue'
import inventory from './views/tab-inventory.vue'
import settings from './views/tab-settings.vue'
import world from './views/tab-world.vue'
import characters from './views/tab-characters.vue'
import enoki from './views/enoki.vue'

export default createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/:catchAll(.*)',
      redirect: '/characters',
    },
    {
      path: '/enoki',
      component: enoki,
    },
    {
      path: '/',
      component: home,
      redirect: '/characters',
      children: [
        {
          name: 'characters',
          path: '/characters',
          component: characters,
        },
        {
          name: 'world',
          path: '/world',
          component: world,
          meta: { keepAlive: true },
        },
        {
          name: 'inventory',
          path: '/inventory',
          component: inventory,
        },
        {
          name: 'settings',
          path: '/settings',
          component: settings,
        },
      ],
    },
  ],
})
