<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const router = useRouter();
const authStore = useAuthStore();
const isLoaded = ref(false);

onMounted(() => {
  // Trigger entrance animation
  setTimeout(() => {
    isLoaded.value = true;
  }, 100);
});

const handleGetStarted = () => {
  router.push('/register');
};

const handleSignIn = () => {
  router.push('/login');
};
</script>

<template>
  <div class="min-h-screen bg-black flex flex-col">
    <!-- Navigation -->
    <nav 
      class="fixed w-full z-50 px-4 sm:px-6 lg:px-8 py-6 bg-black/80 backdrop-blur-sm"
      :class="{ 'opacity-0 translate-y-[-20px]': !isLoaded, 'opacity-100 translate-y-0': isLoaded }"
      style="transition: all 0.6s ease-out 0.2s"
    >
      <div class="max-w-7xl mx-auto flex items-center justify-end">
        <button
          @click="handleSignIn"
          class="btn btn-outline"
        >
          Sign in
        </button>
      </div>
    </nav>

    <!-- Main Content -->
    <main class="flex-grow flex items-center justify-center px-4 sm:px-6 lg:px-8 pt-24">
      <div class="max-w-4xl mx-auto text-center">
        <!-- Logo and Title -->
        <div 
          class="mb-16"
          :class="{ 'opacity-0 translate-y-[-20px]': !isLoaded, 'opacity-100 translate-y-0 animate-float': isLoaded }"
          style="transition: all 0.6s ease-out"
        >
          <svg class="h-16 sm:h-20 w-auto mx-auto text-white" viewBox="0 0 1000 300.74" fill="currentColor">
            <path d="M135.54,162.44v1.29c0,5.96,2.68,6.96,10.33,6.96h27.72c5.27,0,7.55-1.59,7.55-5.96,0-5.27-3.48-6.07-10.63-6.26l-34.67-1.09c-16.79-.5-22.15-4.97-22.15-21.56,0-7.85,1.39-13.22,5.07-16.89,5.26-5.06,13.21-5.56,24.83-5.56h33.68c16.39,0,23.54,5.47,23.54,19.37,0,1.19-.1,2.58-.2,3.97h-21.26v-.3c0-4.76-2.39-7.15-7.25-7.15h-25.43c-6.85,0-10.43,.6-10.43,5.66,0,4.47,2.58,5.77,8.64,5.96l36.26,.9c16.59,.4,22.55,6.55,22.55,23.44,0,9.14-1.69,14.5-8.15,18.68-4.47,2.88-11.82,3.48-22.35,3.48h-29.41c-22.35,0-30.3-3.38-30.3-19.18,0-.79,.1-2.77,.3-5.76h21.75Z"/>
            <path d="M238.41,131.85v10.92h53.54v15.21h-53.54v11.02h57.72v17.48h-79.77V114.26h78.87v17.58h-56.82Z"/>
            <path d="M374.35,186.48l-43.31-52.55v52.55h-22.05V114.26h32.68l43.01,52.95v-52.95h21.95v72.21h-32.29Z"/>
            <path d="M446.24,186.48v-54.53h-30.19v-17.68h82.45v17.68h-30.2v54.53h-22.05Z"/>
            <path d="M540.46,186.48v-25.92l-39.84-46.29h27.12l23.74,28.71,24.84-28.71h26.13l-39.93,46.29v25.92h-22.05Z"/>
            <path d="M675.81,186.48l-43.31-52.55v52.55h-22.05V114.26h32.68l43.01,52.95v-52.95h21.95v72.21h-32.29Z"/>
            <path d="M744.41,131.85v10.92h53.54v15.21h-53.54v11.02h57.72v17.48h-79.77V114.26h78.87v17.58h-56.82Z"/>
            <path d="M886.51,169v17.48h-70.13V114.26h22.05v54.73h48.08Z"/>
          </svg>
          <h2 
            class="mt-4 text-xl text-gray-400"
            :class="{ 'opacity-0': !isLoaded, 'opacity-100': isLoaded }"
            style="transition: opacity 0.6s ease-out 0.4s"
          >
            Vision
          </h2>
        </div>

        <!-- Hero Content -->
        <div class="space-y-8">
          <h1 
            class="text-4xl sm:text-6xl font-bold text-white tracking-tight"
            :class="{ 'opacity-0 translate-y-[-20px]': !isLoaded, 'opacity-100 translate-y-0': isLoaded }"
            style="transition: all 0.6s ease-out 0.2s"
          >
            <span class="text-shadow-neon">Intelligent</span> Video Analytics
          </h1>

          <p 
            class="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed"
            :class="{ 'opacity-0': !isLoaded, 'opacity-100': isLoaded }"
            style="transition: opacity 0.6s ease-out 0.4s"
          >
            Transform your surveillance into actionable insights with AI-powered analytics and real-time monitoring.
          </p>

          <div 
            class="flex flex-col sm:flex-row items-center justify-center gap-4 mt-12"
            :class="{ 'opacity-0 translate-y-[20px]': !isLoaded, 'opacity-100 translate-y-0': isLoaded }"
            style="transition: all 0.6s ease-out 0.6s"
          >
            <button
              @click="handleGetStarted"
              class="btn btn-primary w-full sm:w-auto px-8 py-4 text-lg"
            >
              Start Free Trial
            </button>
            <a
              href="#features"
              class="btn btn-outline w-full sm:w-auto px-8 py-4 text-lg"
            >
              Learn More
            </a>
          </div>
        </div>

        <!-- Features Grid -->
        <div 
          class="mt-32 grid grid-cols-1 md:grid-cols-3 gap-8"
          :class="{ 'opacity-0 translate-y-[20px]': !isLoaded, 'opacity-100 translate-y-0': isLoaded }"
          style="transition: all 0.6s ease-out 0.8s"
        >
          <div class="p-8 rounded-2xl bg-gradient-to-b from-gray-900/50 to-black border border-neon-green/20 backdrop-blur-sm">
            <div class="h-12 w-12 rounded-xl bg-neon-green/10 flex items-center justify-center mx-auto mb-6">
              <svg class="h-6 w-6 text-neon-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 class="text-lg font-medium text-white mb-3">Smart Monitoring</h3>
            <p class="text-gray-400">Real-time video analysis with advanced AI detection and tracking capabilities.</p>
          </div>

          <div class="p-8 rounded-2xl bg-gradient-to-b from-gray-900/50 to-black border border-neon-green/20 backdrop-blur-sm">
            <div class="h-12 w-12 rounded-xl bg-neon-green/10 flex items-center justify-center mx-auto mb-6">
              <svg class="h-6 w-6 text-neon-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 class="text-lg font-medium text-white mb-3">Instant Alerts</h3>
            <p class="text-gray-400">Receive immediate notifications for security events and unusual activities.</p>
          </div>

          <div class="p-8 rounded-2xl bg-gradient-to-b from-gray-900/50 to-black border border-neon-green/20 backdrop-blur-sm">
            <div class="h-12 w-12 rounded-xl bg-neon-green/10 flex items-center justify-center mx-auto mb-6">
              <svg class="h-6 w-6 text-neon-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 class="text-lg font-medium text-white mb-3">Analytics & Insights</h3>
            <p class="text-gray-400">Comprehensive reports and analytics to optimize your security operations.</p>
          </div>
        </div>
      </div>
    </main>

    <!-- Footer -->
    <footer 
      class="mt-auto border-t border-gray-800"
      :class="{ 'opacity-0': !isLoaded, 'opacity-100': isLoaded }"
      style="transition: opacity 0.6s ease-out 1s"
    >
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div class="text-center space-y-2 text-gray-400">
          <p>400 NW 26th St</p>
          <p>Miami, FL 33127</p>
          <p>
            <a href="tel:+18563910926" class="hover:text-neon-green transition-colors">+1 856-391-0926</a>
          </p>
          <p>
            <a href="mailto:control@sentynel.ai" class="hover:text-neon-green transition-colors">control@sentynel.ai</a>
          </p>
        </div>

        <div class="mt-8 pt-8 border-t border-gray-800 text-center">
          <p class="text-gray-400 text-sm">&copy; {{ new Date().getFullYear() }} Sentynel LLC. All rights reserved.</p>
        </div>
      </div>
    </footer>
  </div>
</template>