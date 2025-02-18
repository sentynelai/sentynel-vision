<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const router = useRouter();
const authStore = useAuthStore();

const email = ref('');
const password = ref('');
const confirmPassword = ref('');
const validationError = ref('');

const handleRegister = async () => {
  validationError.value = '';
  
  if (!email.value || !password.value || !confirmPassword.value) {
    validationError.value = 'All fields are required';
    return;
  }
  
  if (password.value !== confirmPassword.value) {
    validationError.value = 'Passwords do not match';
    return;
  }
  
  await authStore.register(email.value, password.value);
  
  if (!authStore.error) {
    router.push('/dashboard');
  }
};

const goToLogin = () => {
  router.push('/login');
};
</script>

<template>
  <div class="min-h-screen bg-black flex flex-col justify-center py-12 sm:px-6 lg:px-8">
    <div class="sm:mx-auto sm:w-full sm:max-w-md">
      <h2 class="text-center text-3xl font-extrabold text-white">
        Create your account
      </h2>
    </div>

    <div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
      <div class="bg-gray-900 py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-neon-green/20">
        <form class="space-y-6" @submit.prevent="handleRegister">
          <div>
            <label for="email" class="block text-sm font-medium text-gray-200">
              Email address
            </label>
            <div class="mt-1">
              <input
                id="email"
                v-model="email"
                type="email"
                required
                class="appearance-none block w-full px-3 py-2 border border-gray-700 rounded-md shadow-sm placeholder-gray-500 bg-gray-800 text-white focus:outline-none focus:ring-neon-green focus:border-neon-green sm:text-sm"
                placeholder="Enter your email"
              />
            </div>
          </div>

          <div>
            <label for="password" class="block text-sm font-medium text-gray-200">
              Password
            </label>
            <div class="mt-1">
              <input
                id="password"
                v-model="password"
                type="password"
                required
                class="appearance-none block w-full px-3 py-2 border border-gray-700 rounded-md shadow-sm placeholder-gray-500 bg-gray-800 text-white focus:outline-none focus:ring-neon-green focus:border-neon-green sm:text-sm"
                placeholder="Choose a password"
              />
            </div>
          </div>

          <div>
            <label for="confirm-password" class="block text-sm font-medium text-gray-200">
              Confirm Password
            </label>
            <div class="mt-1">
              <input
                id="confirm-password"
                v-model="confirmPassword"
                type="password"
                required
                class="appearance-none block w-full px-3 py-2 border border-gray-700 rounded-md shadow-sm placeholder-gray-500 bg-gray-800 text-white focus:outline-none focus:ring-neon-green focus:border-neon-green sm:text-sm"
                placeholder="Confirm your password"
              />
            </div>
          </div>

          <div v-if="validationError || authStore.error" class="text-red-400 text-sm bg-red-900/50 p-3 rounded-md">
            {{ validationError || authStore.error }}
          </div>

          <div>
            <button
              type="submit"
              :disabled="authStore.loading"
              class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-black bg-neon-green hover:bg-neon-green/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-neon-green disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              {{ authStore.loading ? 'Creating account...' : 'Create account' }}
            </button>
          </div>
        </form>

        <div class="mt-6">
          <div class="relative">
            <div class="relative flex justify-center text-sm">
              <span class="px-2 bg-gray-900 text-gray-400">
                Already have an account?
                <button
                  @click="goToLogin"
                  class="font-medium text-neon-green hover:text-neon-green/80 ml-1 transition-colors duration-200"
                >
                  Sign in
                </button>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>