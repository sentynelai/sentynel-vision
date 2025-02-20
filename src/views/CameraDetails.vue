<script setup lang="ts">
import { ref, computed, onMounted, watch, onBeforeUnmount, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useSpotStore } from '../stores/spots';
import { VideoStorageService } from '../services/videoStorage';
import { VideoRecordingService } from '../services/videoRecording';
import { WebRTCService } from '../services/webrtc';
import CameraStatusIndicator from '../components/CameraStatusIndicator.vue';
import { VideoProcessingService } from '../services/videoProcessing';
import { XMarkIcon, ArrowLeftIcon, VideoCameraIcon, PlayIcon, SparklesIcon } from '@heroicons/vue/24/outline';
import { MuxService } from '../services/mux';

import('https://cdn.jsdelivr.net/npm/@mux/mux-player@latest/dist/mux-player.min.js')
  .catch(err => console.error('Error loading Mux Player:', err));

const stats = {
  alerts: []
};

const route = useRoute();
const router = useRouter();
const spotStore = useSpotStore();

const spotId = computed(() => route.params.spotId as string);
const feedId = computed(() => route.params.feedId as string);

const spot = computed(() => spotStore.spots.find(s => s.id === spotId.value));
const feed = computed(() => spot.value?.videoFeeds.find(f => f.id === feedId.value));

const videoRef = ref<HTMLVideoElement | null>(null);
const loading = ref(true);
const showPlayButton = ref(true);
const webRTCService = ref<WebRTCService | null>(null);
const recordingService = ref<VideoRecordingService | null>(null);
const processingService = ref<VideoProcessingService | undefined>(undefined);
const loadingChunks = ref(false);
const error = ref<string | null>(null);
const isInitializing = ref(true);
const videoChunks = ref<any[]>([]);
const currentChunkIndex = ref(0);
const isPlaying = ref(false);
const updateInterval = ref<number | null>(null);
const nextChunkPreloaded = ref(false);
const preloadedChunks = ref<{ [key: number]: HTMLVideoElement }>({});

const hasStartedLoading = ref(false);
const isVideoReady = ref(false);
const playbackAttempts = ref(0);
const MAX_PLAYBACK_ATTEMPTS = 3;

const isStreamReady = ref(false);
const streamCheckInterval = ref<number | null>(null);

const preloadNextChunk = async () => {
  const nextIndex = (currentChunkIndex.value + 1) % videoChunks.value.length;
  const nextChunk = videoChunks.value[nextIndex];
  
  if (!nextChunk || preloadedChunks.value[nextIndex]) return;

  try {
    const preloadVideo = document.createElement('video');
    preloadVideo.preload = 'auto';
    preloadVideo.muted = true;
    preloadVideo.src = nextChunk.url;
    
    await new Promise((resolve, reject) => {
      preloadVideo.onloadedmetadata = resolve;
      preloadVideo.onerror = reject;
    });
    
    preloadedChunks.value[nextIndex] = preloadVideo;
    nextChunkPreloaded.value = true;
  } catch (err) {
    console.warn('Failed to preload next chunk:', err);
  }
};

const loadVideoChunks = async () => {
  try {
    if (!spot.value || !feed.value) {
      error.value = 'Camera feed not found';
      return;
    }

    // Try WebRTC connection first
    if (!webRTCService.value) {
      webRTCService.value = new WebRTCService(spotId.value, feedId.value);
      webRTCService.value.startSignaling(async (data) => {
        if (data.type === 'offer') {
          const answer = await webRTCService.value?.createAnswer(data.offer);
          if (answer) {
            await webRTCService.value?.sendSignalingData({
              type: 'answer',
              answer
            });
          }
        } else if (data.type === 'ice-candidate') {
          await webRTCService.value?.handleIceCandidate(data.candidate);
        }
      });

      // Handle incoming video stream
      webRTCService.value.onTrack((stream) => {
        if (videoRef.value) {
          videoRef.value.srcObject = stream;
          isVideoReady.value = true;
          isPlaying.value = true;
          showPlayButton.value = false;
        }
      });
    }

    // Fallback to chunk-based playback if WebRTC fails
    if (!videoRef.value) {
      error.value = 'Video player not initialized';
      return;
    }

    error.value = null;
    loadingChunks.value = true;

    // Initialize video processing service if needed
    if (!processingService.value) {
      processingService.value = new VideoProcessingService(feedId.value);
      await processingService.value.initialize();
    }

    // Process video chunks
    const processedChunks = await processingService.value.processVideoChunks(
      spotId.value,
      feedId.value
    );
    
    // Only show no chunks error if we're not already playing
    if (processedChunks.length === 0 && !isPlaying.value) {
      error.value = 'No video chunks available yet';
      showPlayButton.value = true;
      return;
    }

    // Check if we have any new chunks
    const hasNewChunks = processedChunks.some(chunk => 
      !videoChunks.value.find(c => c.id === chunk.id)
    );

    if (hasNewChunks) {
      console.log('New chunks available:', processedChunks.length);
      videoChunks.value = processedChunks;

      if (!isPlaying.value) {
        currentChunkIndex.value = 0;
        isVideoReady.value = true;
        await playNextChunk();
        preloadNextChunk();
      }
    }
  } catch (err: any) {
    console.error('Error loading video chunks:', err);
    error.value = err.message || 'Failed to load video chunks';
    showPlayButton.value = true;
  } finally {
    loadingChunks.value = false;
  }
};

const playNextChunk = async () => {
  if (!videoRef.value || !videoChunks.value || videoChunks.value.length === 0) {
    console.warn('No video chunks available or video element not ready');
    error.value = 'No video chunks available';
    showPlayButton.value = true;
    return;
  }

  // Ensure index is within bounds
  if (currentChunkIndex.value < 0 || currentChunkIndex.value >= videoChunks.value.length) {
    currentChunkIndex.value = 0;
  }

  const video = videoRef.value;
  const currentChunk = videoChunks.value[currentChunkIndex.value];
  
  if (!currentChunk?.url) {
    console.warn('Invalid chunk, trying next one');
    currentChunkIndex.value = (currentChunkIndex.value + 1) % videoChunks.value.length;
    return;
  }

  isPlaying.value = false;
  showPlayButton.value = false;
  error.value = null;
  
  try {
    // Download the chunk
    const response = await fetch(currentChunk.url);
    if (!response.ok) {
      throw new Error('Failed to download video chunk');
    }

    // Create a blob URL from the downloaded data
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);

    // Set the video source to the blob URL
    video.src = blobUrl;
    
    // Wait for video to be loaded before playing
    await new Promise((resolve, reject) => {
      video.onloadedmetadata = resolve;
      video.onerror = reject;
    });
    
    const playPromise = video.play();
    if (playPromise) {
      await playPromise;
    }

    isPlaying.value = true;
    error.value = null;

    // Clean up the blob URL when the video ends
    video.onended = () => {
      URL.revokeObjectURL(blobUrl);
    };

  } catch (err: any) {
    console.error('Error playing video chunk:', err);
    playbackAttempts.value++;

    if (playbackAttempts.value < MAX_PLAYBACK_ATTEMPTS) {
      console.log(`Retry attempt ${playbackAttempts.value} of ${MAX_PLAYBACK_ATTEMPTS}`);
      currentChunkIndex.value = (currentChunkIndex.value + 1) % videoChunks.value.length;
      return playNextChunk();
    } else {
      if (err instanceof Error && err.name === 'NotSupportedError') {
        error.value = 'Video format not supported by your browser. Please try a different browser.';
      } else {
        error.value = 'Failed to play video after multiple attempts. Please try again later.';
      }
      playbackAttempts.value = 0;
      showPlayButton.value = true;
    }
  }
};

// Handle video end event
const handleVideoEnded = () => {
  // Reset playback attempts on normal video end
  playbackAttempts.value = 0;
  error.value = null;

  if (!videoChunks.value?.length) {
    loadVideoChunks();
    return;
  }
  
  // Move to next chunk
  const nextIndex = Math.min((currentChunkIndex.value + 1), videoChunks.value.length - 1);
  if (nextIndex !== currentChunkIndex.value) {
    currentChunkIndex.value = nextIndex;
  }
  
  playNextChunk();
};

// Handle play button click
const handlePlayClick = async () => {
  try {
    if (hasStartedLoading.value) {
      if (videoRef.value && isVideoReady.value) {
        videoRef.value.play();
        isPlaying.value = true;
        showPlayButton.value = false;
      } else {
        error.value = null;
        await loadVideoChunks();
      }
      return;
    }

    hasStartedLoading.value = true;
    await loadVideoChunks();
  } catch (err) {
    error.value = err?.message || 'Failed to start video playback';
    showPlayButton.value = true;
  }
};

const startVideoUpdate = () => {
  if (updateInterval.value !== null) clearInterval(updateInterval.value);
  updateInterval.value = window.setInterval(async () => {
    if (!error.value) {
      await loadVideoChunks();
    }
  }, 5000);
};

const stopVideoUpdate = () => {
  if (updateInterval.value !== null) {
    clearInterval(updateInterval.value);
    updateInterval.value = null;
  }
};

const checkStreamStatus = async () => {
  if (!feed.value?.muxStreamId) return;
  
  try {
    const status = await MuxService.getLiveStreamStatus(feed.value.muxStreamId);
    isStreamReady.value = status.status === 'active';
    
    if (!isStreamReady.value) {
      error.value = 'Waiting for stream to start...';
    } else {
      error.value = null;
    }
  } catch (err) {
    console.error('Error checking stream status:', err);
    error.value = 'Stream not available';
  }
};

onMounted(async () => {
  await nextTick();
  try {
    await spotStore.fetchUserSpots();
    if (!spot.value) {
      error.value = 'Spot not found';
    } else if (!feed.value) {
      error.value = 'Camera not found';
    } else {
      // Start checking stream status
      await checkStreamStatus();
      streamCheckInterval.value = window.setInterval(checkStreamStatus, 5000);
    }
    isInitializing.value = false;
    // Start loading chunks when hasStartedLoading becomes true
    watch(hasStartedLoading, async (started) => started && await loadVideoChunks());
  } catch (err: any) {
    console.error('Error loading camera details:', err);
    error.value = err.message || 'Failed to initialize camera feed';
  } finally {
    loading.value = false;
  }
});

const retryConnection = async () => {
  error.value = null;
  currentChunkIndex.value = 0;
  playbackAttempts.value = 0;
  isVideoReady.value = false;
  videoChunks.value = [];
  hasStartedLoading.value = false;
  showPlayButton.value = true;
  startVideoUpdate();
};

onBeforeUnmount(() => {
  stopVideoUpdate();
  if (webRTCService.value) {
    webRTCService.value.close();
    webRTCService.value = null;
  }

  if (recordingService.value) {
    recordingService.value.stopRecording();
    recordingService.value = null;
  }

  if (processingService.value) {
    try {
      processingService.value.cleanup();
    } catch (err) {
      console.warn('Error cleaning up processing service:', err);
    }
  }
  if (videoRef.value) {
    const video = videoRef.value;
    video.onended = null; // Remove event listener
    video.onerror = null; // Remove event listener
    video.onloadedmetadata = null; // Remove event listener
    const src = video.src;
    if (src) {
      URL.revokeObjectURL(src); // Clean up any blob URLs
    }
    try {
      video.pause();
      video.src = '';
      video.load(); // Force reload to clear any errors
    } catch (err) {
      console.warn('Error cleaning up video element:', err);
    }
  }
  isVideoReady.value = false;
  hasStartedLoading.value = false;

  if (streamCheckInterval.value) {
    clearInterval(streamCheckInterval.value);
  }
});

const handleBack = () => {
  router.push(`/spots/${spotId.value}`);
};
</script>

<template>
  <div class="min-h-screen bg-black">
    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center min-h-screen">
      <div class="text-center">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-neon-green mx-auto"></div>
        <p class="mt-4 text-gray-400">Loading camera feed...</p>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="flex items-center justify-center min-h-screen">
      <div class="text-center">
        <XMarkIcon class="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h3 class="text-lg font-medium text-white mb-2">Error</h3>
        <p class="text-red-400">{{ error }}</p>
        <div class="mt-6 space-x-4">
          <button
            @click="retryConnection"
            class="btn btn-primary"
          >
            Retry Connection
          </button>
          <button
            @click="handleBack"
            class="btn btn-outline"
          >
            Back to Spot
          </button>
        </div>
      </div>
    </div>

    <div v-if="feed">
      <!-- Header -->
      <div class="fixed top-0 left-0 right-0 bg-black/80 backdrop-blur-sm border-b border-neon-green/10 z-50">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex items-center justify-between h-16">
            <div class="flex items-center">
              <button
                @click="handleBack"
                class="mr-4 text-gray-400 hover:text-white transition-colors"
              >
                <ArrowLeftIcon class="h-6 w-6" />
              </button>
              <div>
                <h1 class="text-lg font-semibold text-white">{{ feed.name }}</h1>
                <div class="mt-1">
                  <div
                    :class="[
                      'h-2 w-2 rounded-full inline-block mr-2',
                      feed.status === 'active' ? 'bg-green-500' : 'bg-red-500'
                    ]"
                  ></div>
                  <span class="text-sm text-gray-400">
                    {{ feed.status === 'active' ? 'Online' : 'Offline' }}
                  </span>
                </div>
              </div>
            </div>
            <button
              @click="handleBack"
              class="text-gray-400 hover:text-white transition-colors"
            >
              <XMarkIcon class="h-6 w-6" />
            </button>
          </div>
        </div>
      </div>

      <!-- Main Content -->
      <div class="pt-16">
        <!-- Video Player -->
        <div class="aspect-video bg-gray-900 relative overflow-hidden">
          <template v-if="feed?.muxPlaybackId && isStreamReady">
            <mux-player
              :env-key="''"
              :playback-id="feed.muxPlaybackId"
              stream-type="live"
              :metadata="{ 
                video_title: feed.name,
                player_name: 'Sentynel Vision Player'
              }"
              :style="{
                height: '100%',
                width: '100%'
              }"
            ></mux-player>
          </template>

          <!-- Loading/Error State -->
          <div
            v-if="loading || isInitializing || (!isStreamReady && feed?.status === 'active')"
            class="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          >
            <div class="text-center">
              <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-neon-green mx-auto mb-4"></div>
              <p class="text-white">{{ error || 'Connecting to live stream...' }}</p>
            </div>
          </div>

          <!-- Offline State -->
          <div
            v-if="!loading && !isInitializing && (!feed?.muxPlaybackId || feed.status === 'inactive')"
            class="absolute inset-0 flex items-center justify-center bg-gray-800"
          >
            <div class="text-center">
              <VideoCameraIcon class="h-12 w-12 text-gray-600 mx-auto mb-4" />
              <p class="text-gray-400">
                {{ !feed?.muxPlaybackId ? 'No stream available' : 'Camera is currently offline' }}
              </p>
            </div>
          </div>

          <!-- Analysis Overlay (always visible) -->
          <div class="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
            <div class="max-w-7xl mx-auto">
              <div class="grid grid-cols-3 gap-4">
                <div>
                  <p class="text-sm text-gray-400">Objects Detected</p>
                  <p class="text-lg font-semibold text-white">{{ 0 }}</p>
                </div>
                <div>
                  <p class="text-sm text-gray-400">People Count</p>
                  <p class="text-lg font-semibold text-white">{{ 0 }}</p>
                </div>
                <div>
                  <p class="text-sm text-gray-400">Last Event</p>
                  <p class="text-lg font-semibold text-white">{{ 0 || 'None' }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Events and Alerts -->
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <!-- Recent Events -->
            <div class="bg-gray-900 rounded-xl border border-neon-green/20 p-6">
              <h3 class="text-lg font-medium text-white mb-4">Recent Events</h3>
              <div class="space-y-4">
                <div 
                  v-for="alert in stats.alerts" 
                  :key="alert.id"
                  class="flex items-center justify-between p-4 bg-gray-800 rounded-lg"
                >
                  <div class="flex items-center">
                    <div :class="[
                      'h-2 w-2 rounded-full mr-3',
                      alert.severity === 'high' ? 'bg-red-500' :
                      alert.severity === 'medium' ? 'bg-yellow-500' :
                      'bg-blue-500'
                    ]"></div>
                    <div>
                      <p class="text-white font-medium">{{ alert.type }}</p>
                      <p class="text-sm text-gray-400">{{ alert.time }}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Analytics -->
            <div class="bg-gray-900 rounded-xl border border-neon-green/20 p-6">
              <h3 class="text-lg font-medium text-white mb-4">Analytics</h3>
              <!-- Add analytics content here -->
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
mux-player {
  aspect-ratio: 16 / 9;
  width: 100%;
  height: 100%;
  --controls: none;
  --media-object-fit: contain;
  --media-object-position: center;
}
</style>