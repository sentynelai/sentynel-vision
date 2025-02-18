<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { useAuthStore } from './stores/auth';
import { useRouter, useRoute } from 'vue-router';
import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/vue';
import { 
  Bars3Icon, 
  XMarkIcon,
  ChartBarIcon, 
  VideoCameraIcon, 
  DocumentChartBarIcon,
  ArrowRightOnRectangleIcon,
  UserCircleIcon,
  Cog6ToothIcon,
  KeyIcon,
  BellIcon
} from '@heroicons/vue/24/outline';
import SentynelLogo from './components/SentynelLogo.vue';

const authStore = useAuthStore();
const router = useRouter();
const route = useRoute();
const showUserMenu = ref(false);

const showNav = computed(() => {
  // Hide nav for specific routes
  const hideNavRoutes = ['/', '/login', '/register'];
  const hideNavPrefixes = ['/c/', '/connect/'];

  // Hide nav on root path if not authenticated
  if (route.path === '/' && !authStore.user) return false;

  // Hide nav for specific routes
  if (hideNavRoutes.includes(route.path)) return false;

  // Hide nav for routes with specific prefixes
  if (hideNavPrefixes.some(prefix => route.path.startsWith(prefix))) return false;

  return true;
});

const navigation = computed(() => [
  { 
    name: 'Dashboard', 
    path: '/dashboard', 
    current: route.path === '/dashboard',
    icon: ChartBarIcon
  },
  { 
    name: 'Spots', 
    path: '/spots', 
    current: route.path.startsWith('/spots'),
    icon: VideoCameraIcon
  },
  { 
    name: 'Reports', 
    path: '/reports', 
    current: route.path === '/reports',
    icon: DocumentChartBarIcon
  }
]);

const handleLogout = async () => {
  if (await authStore.logout()) {
    router.push('/login');
  }
};

const navigateTo = (path: string) => {
  if (path !== route.path) {
    router.push(path);
  }
};

// Handle navigation errors
const handleRouteError = (error: any) => {
  if (error) {
    console.error('Navigation error:', error);
    // Only redirect if we're not already on the home page
    if (route.path !== '/') {
      router.push('/');
    }
  }
};

onMounted(() => {
  // Use router.beforeEach for more reliable error handling
  router.beforeEach((to, from, next) => {
    try {
      next();
    } catch (error) {
      handleRouteError(error);
      next('/');
    }
  });
});

onBeforeUnmount(() => {
  // No need to remove the beforeEach guard as it's automatically cleaned up
});
</script>

<template>
  <div class="min-h-screen bg-black">
    <!-- Navigation -->
    <Disclosure v-if="showNav" as="nav" class="sticky top-0 z-50 bg-black/80 backdrop-blur-sm border-b border-neon-green/10" v-slot="{ open }">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="flex h-16 justify-between">
          <div class="flex">
            <!-- Logo -->
            <div class="flex-shrink-0 flex items-center">
              <button @click="navigateTo('/')" class="flex items-center space-x-2">
                <SentynelLogo 
                  :minimal="true"
                  class="h-8 text-neon-green hover:text-white transition-colors duration-200" 
                />
              </button>
            </div>

            <!-- Main Navigation -->
            <div class="hidden md:ml-8 md:flex md:space-x-6">
              <button
                v-for="item in navigation"
                :key="item.name"
                @click="navigateTo(item.path)"
                :class="[
                  item.current
                    ? 'bg-neon-green/10 text-neon-green'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white',
                  'inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200'
                ]"
              >
                <component 
                  :is="item.icon" 
                  class="h-5 w-5 mr-2" 
                  :class="{ 'text-neon-green': item.current }"
                />
                {{ item.name }}
              </button>
            </div>
          </div>

          <div class="hidden sm:flex sm:items-center space-x-4">
            <!-- Notifications -->
            <button
              v-if="authStore.user"
              class="relative p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-all duration-200"
            >
              <BellIcon class="h-6 w-6" />
              <span class="absolute top-1 right-1 h-2 w-2 rounded-full bg-neon-green"></span>
            </button>

            <!-- User Menu -->
            <button
              v-if="authStore.user"
              @click="showUserMenu = !showUserMenu"
              class="relative p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-all duration-200"
            >
              <UserCircleIcon class="h-6 w-6" />
              
              <!-- Dropdown Menu -->
              <div 
                v-if="showUserMenu"
                class="absolute right-0 mt-2 w-48 py-2 bg-gray-900 rounded-lg shadow-xl border border-neon-green/20 backdrop-blur-sm z-50"
              >
                <div class="px-4 py-2 border-b border-gray-800">
                  <p class="text-sm text-white">{{ authStore.user.email }}</p>
                </div>
                <button
                  class="w-full px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-800 flex items-center"
                  @click="router.push('/account')"
                >
                  <Cog6ToothIcon class="h-5 w-5 mr-2" />
                  Account Settings
                </button>
                <button
                  class="w-full px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-800 flex items-center"
                  @click="router.push('/security')"
                >
                  <KeyIcon class="h-5 w-5 mr-2" />
                  Security
                </button>
                <div class="border-t border-gray-800 mt-2 pt-2">
                  <button
                    class="w-full px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-gray-800 flex items-center"
                    @click="handleLogout"
                  >
                    <ArrowRightOnRectangleIcon class="h-5 w-5 mr-2" />
                    Sign out
                  </button>
                </div>
              </div>
            </button>
          </div>

          <div class="-mr-2 flex items-center md:hidden">
            <DisclosureButton class="inline-flex items-center justify-center rounded-lg p-2 text-gray-400 hover:bg-gray-800 hover:text-white transition-all duration-200">
              <span class="sr-only">Open main menu</span>
              <Bars3Icon v-if="!open" class="block h-6 w-6" aria-hidden="true" />
              <XMarkIcon v-else class="block h-6 w-6" aria-hidden="true" />
            </DisclosureButton>
          </div>
        </div>
      </div>

      <DisclosurePanel class="md:hidden">
        <div class="space-y-1 p-2">
          <button
            v-for="item in navigation"
            :key="item.name"
            @click="navigateTo(item.path)"
            :class="[
              item.current
                ? 'bg-neon-green/10 text-neon-green'
                : 'text-gray-400 hover:bg-gray-800 hover:text-white',
              'flex items-center w-full px-4 py-2 rounded-lg text-base font-medium transition-all duration-200'
            ]"
          >
            <component 
              :is="item.icon" 
              class="h-5 w-5 mr-2"
              :class="{ 'text-neon-green': item.current }"
            />
            {{ item.name }}
          </button>
          <button
            v-if="authStore.user"
            @click="handleLogout"
            class="flex items-center w-full px-4 py-2 rounded-lg text-base font-medium text-red-400 hover:bg-gray-800 hover:text-red-300 transition-all duration-200"
          >
            <ArrowRightOnRectangleIcon 
              class="h-5 w-5 mr-2"
            />
            Sign out
          </button>
        </div>
      </DisclosurePanel>
    </Disclosure>

    <!-- Main content -->
    <main :class="{ 'pt-16': showNav }">
      <router-view v-slot="{ Component }">
        <Transition
          name="page"
          mode="out-in"
          appear
        >
          <component :is="Component" />
        </Transition>
      </router-view>
    </main>
  </div>
</template>