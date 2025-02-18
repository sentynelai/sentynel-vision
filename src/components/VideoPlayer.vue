<!-- Video Player Component -->
<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
import { PlayIcon, PauseIcon, SpeakerWaveIcon, SpeakerXMarkIcon } from '@heroicons/vue/24/outline';

const props = defineProps<{
  src: string;
  poster?: string;
  autoplay?: boolean;
  muted?: boolean;
  controls?: boolean;
  loop?: boolean;
}>();

const video = ref<HTMLVideoElement | null>(null);
const isPlaying = ref(false);
const isMuted = ref(props.muted || false);
const currentTime = ref(0);
const duration = ref(0);
const volume = ref(1);
const isLoading = ref(true);
const error = ref<string | null>(null);
const showControls = ref(false);
const controlsTimeout = ref<number | null>(null);

// Format time in MM:SS
const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// Handle play/pause
const togglePlay = () => {
  if (!video.value) return;
  
  if (video.value.paused) {
    video.value.play();
  } else {
    video.value.pause();
  }
};

// Handle mute toggle
const toggleMute = () => {
  if (!video.value) return;
  isMuted.value = !isMuted.value;
  video.value.muted = isMuted.value;
};

// Handle volume change
const handleVolumeChange = (e: Event) => {
  const input = e.target as HTMLInputElement;
  volume.value = parseFloat(input.value);
  if (video.value) {
    video.value.volume = volume.value;
  }
};

// Handle seek
const handleSeek = (e: Event) => {
  const input = e.target as HTMLInputElement;
  const time = parseFloat(input.value);
  if (video.value) {
    video.value.currentTime = time;
    currentTime.value = time;
  }
};

// Show/hide controls
const showControlsTemporarily = () => {
  showControls.value = true;
  
  if (controlsTimeout.value) {
    clearTimeout(controlsTimeout.value);
  }
  
  controlsTimeout.value = window.setTimeout(() => {
    showControls.value = false;
  }, 3000);
};

// Event listeners
onMounted(() => {
  if (!video.value) return;

  const videoEl = video.value;

  videoEl.addEventListener('loadstart', () => {
    isLoading.value = true;
    error.value = null;
  });

  videoEl.addEventListener('loadedmetadata', () => {
    duration.value = videoEl.duration;
  });

  videoEl.addEventListener('canplay', () => {
    isLoading.value = false;
  });

  videoEl.addEventListener('timeupdate', () => {
    currentTime.value = videoEl.currentTime;
  });

  videoEl.addEventListener('play', () => {
    isPlaying.value = true;
  });

  videoEl.addEventListener('pause', () => {
    isPlaying.value = false;
  });

  videoEl.addEventListener('error', () => {
    isLoading.value = false;
    error.value = 'Failed to load video';
  });

  // Initialize volume
  videoEl.volume = volume.value;
  videoEl.muted = isMuted.value;
});

onBeforeUnmount(() => {
  if (controlsTimeout.value) {
    clearTimeout(controlsTimeout.value);
  }
});

// Watch for prop changes
watch(() => props.src, () => {
  if (video.value) {
    video.value.load();
  }
});
</script>

<template>
  <div 
    class="relative group"
    @mousemove="showControlsTemporarily"
    @mouseleave="showControls = false"
  >
    <!-- Video Element -->
    <video
      ref="video"
      :src="src"
      :poster="poster"
      :autoplay="autoplay"
      :loop="loop"
      class="w-full rounded-lg"
      @click="togglePlay"
    ></video>

    <!-- Loading Overlay -->
    <div 
      v-if="isLoading"
      class="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg"
    >
      <div class="animate-spin rounded-full h-12 w-12 border-4 border-neon-green border-t-transparent"></div>
    </div>

    <!-- Error Overlay -->
    <div 
      v-if="error"
      class="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg"
    >
      <div class="text-center">
        <p class="text-red-500 mb-2">{{ error }}</p>
        <button 
          @click="video?.load()"
          class="px-4 py-2 bg-neon-green text-black rounded-lg hover:bg-neon-green/90"
        >
          Retry
        </button>
      </div>
    </div>

    <!-- Controls -->
    <div 
      v-if="controls"
      class="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 to-transparent transition-opacity duration-300"
      :class="{ 'opacity-0': !showControls && !isLoading && !error }"
    >
      <!-- Progress Bar -->
      <input
        type="range"
        :value="currentTime"
        :max="duration"
        @input="handleSeek"
        class="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
      />

      <div class="flex items-center justify-between mt-2">
        <!-- Play/Pause -->
        <button 
          @click="togglePlay"
          class="p-2 text-white hover:text-neon-green transition-colors"
        >
          <PlayIcon v-if="!isPlaying" class="h-6 w-6" />
          <PauseIcon v-else class="h-6 w-6" />
        </button>

        <!-- Time Display -->
        <div class="text-white text-sm">
          {{ formatTime(currentTime) }} / {{ formatTime(duration) }}
        </div>

        <!-- Volume Controls -->
        <div class="flex items-center space-x-2">
          <button 
            @click="toggleMute"
            class="p-2 text-white hover:text-neon-green transition-colors"
          >
            <SpeakerWaveIcon v-if="!isMuted" class="h-6 w-6" />
            <SpeakerXMarkIcon v-else class="h-6 w-6" />
          </button>
          <input
            type="range"
            :value="volume"
            min="0"
            max="1"
            step="0.1"
            @input="handleVolumeChange"
            class="w-20 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
input[type="range"] {
  @apply accent-neon-green;
}

input[type="range"]::-webkit-slider-thumb {
  @apply w-3 h-3 rounded-full bg-neon-green;
}
</style>