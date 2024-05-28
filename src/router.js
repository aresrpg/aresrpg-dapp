import { createRouter, createWebHistory } from 'vue-router'

export default createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/:catchAll(.*)',
      redirect: '/characters',
    },
    {
      path: '/enoki',
      component: () => import('./views/enoki.vue'),
    },
    {
      path: '/',
      component: () => import('./views/home.vue'),
      redirect: '/characters',
      children: [
        {
          name: 'characters',
          path: '/characters',
          component: () => import('./views/tab-characters.vue'),
        },
        {
          name: 'world',
          path: '/world',
          component: () => import('./views/tab-world.vue'),
          meta: { keepAlive: true },
        },
        {
          name: 'shop',
          path: '/shop',
          component: () => import('./views/tab-shop.vue'),
        },
        {
          name: 'settings',
          path: '/settings',
          component: () => import('./views/tab-settings.vue'),
        },
        {
          name: 'admin',
          path: '/admin',
          component: () => import('./views/tab-admin.vue'),
        },
      ],
    },
  ],
})
