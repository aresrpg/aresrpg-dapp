import { createRouter, createWebHistory } from 'vue-router'

import home from './views/home.vue'
import shop from './views/tab-shop.vue'
import settings from './views/tab-settings.vue'
import world from './views/tab-world.vue'
import characters from './views/tab-characters.vue'
import enoki from './views/enoki.vue'
import admin from './views/tab-admin.vue'
import workshop from './views/tab-workshop.vue'

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
          name: 'shop',
          path: '/shop',
          component: shop,
        },
        {
          name: 'settings',
          path: '/settings',
          component: settings,
        },
        {
          name: 'admin',
          path: '/admin',
          component: admin,
        },
        {
          name: 'workshop',
          path: '/workshop',
          component: workshop,
        },
      ],
    },
  ],
})
