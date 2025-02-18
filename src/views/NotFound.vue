<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { XMarkIcon } from '@heroicons/vue/24/outline';

const router = useRouter();
const authStore = useAuthStore();

const goHome = () => {
  // Redirect to dashboard if authenticated, otherwise to home
  router.push(authStore.user ? '/dashboard' : '/');
};
</script>

<template>
  <div class="min-h-screen bg-black flex items-center justify-center px-4">
    <div class="text-center">
      <XMarkIcon class="h-12 w-12 text-red-500 mx-auto mb-4" />
      <h1 class="text-4xl font-bold text-white mb-2">404</h1>
      <p class="text-xl text-gray-400 mb-4">Page not found</p>
      <p class="text-gray-500 mb-8">The page you're looking for doesn't exist or you don't have permission to access it.</p>
      <button
        @click="goHome"
        class="btn btn-primary"
      >
        {{ authStore.user ? 'Go to Dashboard' : 'Go Home' }}
      </button>
    </div>
  </div>
</template>