import { createRouter, createWebHistory } from 'vue-router';
import LoginView from '../views/LoginView.vue';
import DashboardView from '../views/DashboardView.vue';
import AboutView from '../views/AboutView.vue';
import { isAuthenticated } from '../auth.ts';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'dashboard',
      component: DashboardView,
    },
    {
      path: '/about',
      name: 'about',
      component: AboutView,
    },
    {
      path: '/login',
      name: 'login',
      component: LoginView,
    },
  ],
});

router.beforeEach((to) => {
  const publicPaths = ['/login'];
  if (!publicPaths.includes(to.path) && !isAuthenticated.value) {
    return { name: 'login', query: { redirect: to.fullPath } };
  }
  if (to.path === '/login' && isAuthenticated.value) {
    return { name: 'dashboard' };
  }
  return true;
});

export default router;
