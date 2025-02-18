<!-- Video List Component -->
<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { VideoStorageService } from '../services/videoStorage';
import { useAuthStore } from '../stores/auth';
import VideoPlayer from './VideoPlayer.vue';
import { MagnifyingGlassIcon, FunnelIcon } from '@heroicons/vue/24/outline';

const authStore = useAuthStore();

const videos = ref<any[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);
const searchQuery = ref('');
const showPrivate = ref(false);
const currentPage = ref(1);
const totalPages = ref(1);
const itemsPerPage = 12;

const loadVideos = async () => {
  if (!authStore.user) return;
  
  try {
    loading.value = true;
    error.value = null;
    
    const results = await VideoStorageService.getVideos(authStore.user.uid, {
      page: currentPage.value,
      limit: itemsPerPage,
      search: searchQuery.value,
      isPrivate: showPrivate.value
    });
    
    videos.value = results;
  } catch (err: any) {
    console.error('Error loading videos:', err);
    error.value = err.message || 'Failed to load videos';
  } finally {
    loading.value = false;
  }
};

const handleSearch = () => {
  currentPage.value = 1;
  loadVideos();
};

const handleDelete = async (videoId: string) => {
  if (!authStore.user) return;
  
  try {
    await VideoStorageService.deleteVideo(videoId, authStore.user.uid);
    await loadVideos();
  } catch (err: any) {
    console.error('Error deleting video:', err);
    error.value = err.message || 'Failed to delete video';
  }
};

// Watch for filter changes
watch([showPrivate], () => {
  currentPage.value = 1;
  loadVideos();
});

onMounted(() => {
  loadVideos();
});
</script>

<template>
  <div class="space-y-6">
    <!-- Search and Filters -->
    <div class="flex flex-col sm:flex-row gap-4">
      <div class="flex-1">
        <div class="relative">
          <input
            v-model="searchQuery"
            type="text"
            class="block w-full pl-10 pr-3 py-2 rounded-lg"
            placeholder="Search videos..."
            @keyup.enter="handleSearch"
          />
          <MagnifyingGlassIcon 
            class="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400"
          />
        </div>
      </div>
      
      <div class="flex items-center space-x-4">
        <div class="flex items-center">
          <input
            v-model="showPrivate"
            type="checkbox"
            class="rounded border-gray-700 text-neon-green focus:ring-neon-green bg-gray-800"
          />
          <label class="ml-2 text-sm text-gray-200">
            Show private only
          </label>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center py-12">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-neon-green"></div>
    </div>

    <!-- Error State -->
    <div 
      v-else-if="error"
      class="bg-red-900/50 border border-red-500/50 rounded-lg p-4"
    >
      <p class="text-sm text-red-400">{{ error }}</p>
      <button
        @click="loadVideos"
        class="mt-2 text-sm text-neon-green hover:text-neon-green/80 transition-colors"
      >
        Try again
      </button>
    </div>

    <!-- Empty State -->
    <div 
      v-else-if="!videos.length"
      class="text-center py-12"
    >
      <p class="text-gray-400">No videos found</p>
    </div>

    <!-- Video Grid -->
    <div 
      v-else 
      class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
    >
      <div
        v-for="video in videos"
        :key="video.id"
        class="bg-gray-900 rounded-xl border border-neon-green/20 overflow-hidden"
      >
        <VideoPlayer
          :src="video.url"
          :poster="video.thumbnailUrl"
          :controls="true"
        />
        
        <div class="p-4">
          <h3 class="text-lg font-semibold text-white mb-1">
            {{ video.title }}
          </h3>
          <p v-if="video.description" class="text-sm text-gray-400 mb-4">
            {{ video.description }}
          </p>
          
          <div class="flex items-center justify-between text-sm text-gray-500">
            <span>{{ new Date(video.createdAt).toLocaleDateString() }}</span>
            <button
              @click="handleDelete(video.id)"
              class="text-red-500 hover:text-red-400 transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Pagination -->
    <div 
      v-if="totalPages > 1"
      class="flex justify-center space-x-2"
    >
      <button
        v-for="page in totalPages"
        :key="page"
        @click="currentPage = page"
        :class="[
          'px-3 py-1 rounded-lg transition-colors',
          currentPage === page
            ? 'bg-neon-green text-black'
            : 'bg-gray-800 text-white hover:bg-gray-700'
        ]"
      >
        {{ page }}
      </button>
    </div>
  </div>
</template>