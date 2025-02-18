<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useSpotStore } from '../stores/spots';
import { 
  VideoCameraIcon, 
  ExclamationTriangleIcon,
  UserGroupIcon,
  ClockIcon
} from '@heroicons/vue/24/outline';

const spotStore = useSpotStore();
const loading = ref(true);
const error = ref<string | null>(null);

const stats = ref({
  activeSpots: 0,
  totalAlerts: 0,
  totalVisitors: 0,
  uptime: '0%'
});

const recentAlerts = ref<{
  id: number;
  spotName: string;
  type: string;
  timestamp: Date;
  severity: 'high' | 'medium' | 'low';
}[]>([]);

// Compute active spots from the store
const activeSpots = computed(() => {
  return spotStore.spots.filter(spot => 
    spot.videoFeeds?.some(feed => feed.status === 'active')
  ).length;
});

// Update stats when spots are loaded
const updateStats = () => {
  stats.value = {
    activeSpots: activeSpots.value,
    totalAlerts: recentAlerts.value.length,
    totalVisitors: calculateTotalVisitors(),
    uptime: calculateUptime()
  };
};

const calculateTotalVisitors = () => {
  if (!spotStore.spots.length) return 0;
  
  return spotStore.spots.reduce((total, spot) => {
    // For now, return a random number between 0-100 for demonstration
    return total + Math.floor(Math.random() * 100);
  }, 0);
};

const calculateUptime = () => {
  const totalFeeds = spotStore.spots.reduce((total, spot) => 
    total + (spot.videoFeeds?.length || 0), 0);
  const activeFeeds = spotStore.spots.reduce((total, spot) => 
    total + (spot.videoFeeds?.filter(feed => feed.status === 'active').length || 0), 0);
  
  if (totalFeeds === 0) return '0%';
  return `${((activeFeeds / totalFeeds) * 100).toFixed(1)}%`;
};

const formatTime = (date: Date) => {
  const minutes = Math.round((date.getTime() - Date.now()) / (1000 * 60));
  return new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(minutes, 'minute');
};

onMounted(async () => {
  try {
    loading.value = true;
    await spotStore.fetchUserSpots();
    updateStats();
  } catch (err: any) {
    error.value = err.message || 'Failed to load dashboard data';
    console.error('Error loading dashboard data:', err);
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="min-h-screen bg-black">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Loading State -->
      <div v-if="loading" class="flex items-center justify-center min-h-[50vh]">
        <div class="text-center">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-neon-green mx-auto"></div>
          <p class="mt-4 text-gray-400">Loading dashboard...</p>
        </div>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="flex items-center justify-center min-h-[50vh]">
        <div class="text-center">
          <ExclamationTriangleIcon class="h-12 w-12 text-red-500 mx-auto" />
          <p class="mt-4 text-red-400">{{ error }}</p>
        </div>
      </div>

      <template v-else>
        <!-- Stats Overview -->
        <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <div class="bg-gray-900 rounded-lg p-6 border border-neon-green/20">
            <div class="flex items-center">
              <div class="p-3 rounded-lg bg-neon-green/10">
                <VideoCameraIcon class="h-6 w-6 text-neon-green" />
              </div>
              <div class="ml-4">
                <p class="text-sm font-medium text-gray-400">Active Spots</p>
                <p class="text-2xl font-semibold text-white">{{ stats.activeSpots }}</p>
              </div>
            </div>
          </div>

          <div class="bg-gray-900 rounded-lg p-6 border border-neon-green/20">
            <div class="flex items-center">
              <div class="p-3 rounded-lg bg-red-500/10">
                <ExclamationTriangleIcon class="h-6 w-6 text-red-500" />
              </div>
              <div class="ml-4">
                <p class="text-sm font-medium text-gray-400">Active Alerts</p>
                <p class="text-2xl font-semibold text-white">{{ stats.totalAlerts }}</p>
              </div>
            </div>
          </div>

          <div class="bg-gray-900 rounded-lg p-6 border border-neon-green/20">
            <div class="flex items-center">
              <div class="p-3 rounded-lg bg-blue-500/10">
                <UserGroupIcon class="h-6 w-6 text-blue-500" />
              </div>
              <div class="ml-4">
                <p class="text-sm font-medium text-gray-400">Total Visitors</p>
                <p class="text-2xl font-semibold text-white">{{ stats.totalVisitors }}</p>
              </div>
            </div>
          </div>

          <div class="bg-gray-900 rounded-lg p-6 border border-neon-green/20">
            <div class="flex items-center">
              <div class="p-3 rounded-lg bg-purple-500/10">
                <ClockIcon class="h-6 w-6 text-purple-500" />
              </div>
              <div class="ml-4">
                <p class="text-sm font-medium text-gray-400">System Uptime</p>
                <p class="text-2xl font-semibold text-white">{{ stats.uptime }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Recent Alerts -->
        <div class="bg-gray-900 rounded-lg border border-neon-green/20">
          <div class="p-6">
            <h2 class="text-xl font-semibold text-white mb-4">Recent Alerts</h2>
            
            <!-- Empty State -->
            <div v-if="!recentAlerts.length" class="py-8 text-center">
              <ExclamationTriangleIcon class="h-8 w-8 text-gray-400 mx-auto" />
              <p class="mt-2 text-sm text-gray-400">No recent alerts</p>
            </div>

            <!-- Alerts List -->
            <div v-else class="space-y-4">
              <div v-for="alert in recentAlerts" :key="alert.id"
                   class="flex items-center justify-between p-4 bg-gray-800 rounded-lg border border-gray-700">
                <div class="flex items-center">
                  <div :class="[
                    'h-3 w-3 rounded-full',
                    alert.severity === 'high' ? 'bg-red-500' : 'bg-yellow-500'
                  ]"></div>
                  <div class="ml-4">
                    <p class="text-white font-medium">{{ alert.spotName }}</p>
                    <p class="text-sm text-gray-400">{{ alert.type }}</p>
                  </div>
                </div>
                <div class="text-right">
                  <p class="text-sm text-gray-400">{{ formatTime(alert.timestamp) }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>