<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { XMarkIcon, ChartBarIcon, BellIcon, VideoCameraIcon } from '@heroicons/vue/24/outline';
import VideoPlayer from './VideoPlayer.vue';
import { AIService } from '../services/ai';

const props = defineProps<{
  show: boolean;
  videoUrl: string;
  spotName: string;
  customInstructions?: string;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const analysis = ref<string | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);

const metrics = ref({
  objectsDetected: 0,
  peopleCount: 0,
  lastEvent: null as string | null
});

const analyzeFrame = async () => {
  if (!props.customInstructions) return;
  
  try {
    loading.value = true;
    error.value = null;
    
    // Capture current frame
    const video = document.querySelector('video');
    if (!video) return;
    
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.drawImage(video, 0, 0);
    const imageData = canvas.toDataURL('image/jpeg', 0.8);
    
    // Analyze with AI
    const result = await AIService.analyzeFrame(imageData, props.customInstructions);
    analysis.value = result;
    
    // Update metrics (mock data for now)
    metrics.value = {
      objectsDetected: Math.floor(Math.random() * 10),
      peopleCount: Math.floor(Math.random() * 5),
      lastEvent: 'Person detected'
    };
    
  } catch (err: any) {
    console.error('Analysis error:', err);
    error.value = err.message;
  } finally {
    loading.value = false;
  }
};

// Analyze frame periodically
let analysisInterval: number | null = null;

onMounted(() => {
  analysisInterval = window.setInterval(analyzeFrame, 10000);
});

onBeforeUnmount(() => {
  if (analysisInterval) {
    clearInterval(analysisInterval);
  }
});
</script>

<template>
  <div v-if="show" class="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div class="bg-gray-900 rounded-xl border border-neon-green/20 max-w-6xl w-full max-h-[90vh] overflow-hidden">
      <!-- Header -->
      <div class="flex items-center justify-between p-4 border-b border-neon-green/20">
        <h3 class="text-xl font-semibold text-white">{{ spotName }}</h3>
        <button 
          @click="$emit('close')"
          class="text-gray-400 hover:text-white transition-colors"
        >
          <XMarkIcon class="h-6 w-6" />
        </button>
      </div>
      
      <div class="flex flex-col lg:flex-row h-full">
        <!-- Video Player -->
        <div class="flex-1 relative">
          <VideoPlayer
            :src="videoUrl"
            :controls="true"
            class="w-full h-full"
          />
          
          <!-- Metrics Overlay -->
          <div class="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
            <div class="grid grid-cols-3 gap-4">
              <div>
                <p class="text-sm text-gray-400">Objects Detected</p>
                <p class="text-lg font-semibold text-white">{{ metrics.objectsDetected }}</p>
              </div>
              <div>
                <p class="text-sm text-gray-400">People Count</p>
                <p class="text-lg font-semibold text-white">{{ metrics.peopleCount }}</p>
              </div>
              <div>
                <p class="text-sm text-gray-400">Last Event</p>
                <p class="text-lg font-semibold text-white">{{ metrics.lastEvent || 'None' }}</p>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Analysis Panel -->
        <div class="w-full lg:w-80 border-l border-neon-green/20 bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div class="space-y-4">
            <h4 class="text-lg font-medium text-white flex items-center">
              <ChartBarIcon class="h-5 w-5 mr-2 text-neon-green" />
              Live Analysis
            </h4>
            
            <!-- Loading State -->
            <div v-if="loading" class="flex items-center justify-center py-4">
              <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-neon-green"></div>
            </div>
            
            <!-- Error State -->
            <div v-else-if="error" class="bg-red-900/50 border border-red-500/50 rounded-lg p-4">
              <p class="text-sm text-red-400">{{ error }}</p>
            </div>
            
            <!-- Analysis Results -->
            <div v-else-if="analysis" class="space-y-4">
              <p class="text-gray-400">{{ analysis }}</p>
            </div>
            
            <!-- Alerts -->
            <div class="mt-8">
              <h4 class="text-lg font-medium text-white flex items-center mb-4">
                <BellIcon class="h-5 w-5 mr-2 text-red-500" />
                Recent Alerts
              </h4>
              
              <div class="space-y-2">
                <div class="p-3 bg-red-900/20 border border-red-500/20 rounded-lg">
                  <p class="text-red-400 font-medium">Motion Detected</p>
                  <p class="text-sm text-red-300/70">2 minutes ago</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>