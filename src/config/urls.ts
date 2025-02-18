import { createRouter, createWebHistory } from 'vue-router';
import { auth } from '../firebase/config';
import { useAuthStore } from '../stores/auth';
import type { RouteRecordRaw } from 'vue-router';

// URL configuration for different environments
const isProd = import.meta.env.PROD;
const DEV_DOMAIN = 'localhost:5173';
const PROD_DOMAIN = 'sentynel.vision'; // Main domain
const PREVIEW_DOMAIN = 'sentynel-vision.netlify.app'; // Preview domain

export const getBaseUrl = () => {
  if (isProd) {
    // Check if we're on the preview domain
    const hostname = window.location.hostname;
    return `https://${hostname === PREVIEW_DOMAIN ? PREVIEW_DOMAIN : PROD_DOMAIN}`;
  }
  return `http://${DEV_DOMAIN}`;
};

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('../views/Home.vue'),
    meta: { requiresGuest: true }
  },
  {
    path: '/login',
    component: () => import('../views/Login.vue'),
    meta: { requiresGuest: true }
  },
  {
    path: '/register',
    component: () => import('../views/Register.vue'),
    meta: { requiresGuest: true }
  },
  {
    path: '/dashboard',
    component: () => import('../views/Dashboard.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/spots',
    component: () => import('../views/Spots.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/spots/:id',
    component: () => import('../views/SpotDetails.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/spots/:spotId/camera/:feedId',
    component: () => import('../views/CameraDetails.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/reports',
    component: () => import('../views/Reports.vue'),
    meta: { requiresAuth: true }
  },
  // Short URL format for camera connections
  {
    path: '/c/:code',
    name: 'connect',
    component: () => import('../views/Connect.vue'),
    props: route => ({
      code: route.params.code
    }),
    meta: { 
      requiresAuth: false, 
      skipAuthCheck: true,
      title: 'Connect Camera'
    },
    // Add alias to handle both /c/ and /connect/ paths
    alias: '/connect/:code'
  },
  // Add catch-all 404 route
  {
    path: '/:pathMatch(.*)*', 
    name: 'NotFound',
    component: () => import('../views/NotFound.vue'),
    meta: {
      title: 'Page Not Found',
      skipAuthCheck: true
    }
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore();
  
  // Skip auth check for connect routes and 404
  if (to.matched.some(record => record.meta.skipAuthCheck)) {
    next();
    return;
  }

  try {
    // Wait for auth to initialize
    if (!authStore.initialized) {
      await new Promise<void>((resolve) => {
        const unwatch = authStore.$subscribe((mutation, state) => {
          if (state.initialized) {
            unwatch();
            resolve();
          }
        });
      });
    }

    const requiresAuth = to.matched.some(record => record.meta.requiresAuth);
    const requiresGuest = to.matched.some(record => record.meta.requiresGuest);

    // Handle authentication requirements
    if (requiresAuth && !authStore.user) {
      next({ 
        path: '/login', 
        query: { redirect: to.fullPath }
      });
    } else if (requiresGuest && authStore.user) {
      next({ path: '/dashboard' });
    } else {
      next();
    }
  } catch (error) {
    console.error('Navigation error:', error);
    next('/');
  }
});

export default router;