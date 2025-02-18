import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { useSpotStore } from '../stores/spots';
import type { RouteRecordRaw } from 'vue-router';

// Camera connection routes should be accessible without auth and bypass SPA routing
const publicRoutes = ['/c/', '/connect/'];

const routes: RouteRecordRaw[] = [
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
    }
  },
  {
    path: '/connect/:code',
    redirect: to => `/c/${to.params.code}`,
    meta: {
      skipAuthCheck: true
    }
  },
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
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('../views/NotFound.vue'),
    meta: {
      skipAuthCheck: true,
      title: 'Page Not Found'
    }
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore();
  const spotStore = useSpotStore();

  // Check if this is a camera connection route
  const isCameraRoute = publicRoutes.some(route => to.path.startsWith(route));
  
  // Handle camera connection routes
  if (isCameraRoute) {
    try {
      const code = to.params.code as string;
      await spotStore.fetchSpotByConnectionToken(code);
      next();
      return;
    } catch (err) {
      console.error('Error fetching spot:', err);
      next('/404');
      return;
    }
  }

  // Skip auth check for 404 route
  if (to.name === 'NotFound') {
    next();
    return;
  }

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
    next('/dashboard');
  } else {
    next();
  }
});

export default router;