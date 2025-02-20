<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useSpotStore } from '../stores/spots';
import { MuxService } from '../services/mux';
import { 
  ExclamationTriangleIcon, 
  StopIcon, 
  PlayIcon, 
  SparklesIcon,
  CloudArrowUpIcon,
  VideoCameraIcon,
  ServerIcon,
  BoltIcon
} from '@heroicons/vue/24/outline';
import { nextTick } from 'vue';

// Status tracking
const uploadStatus = ref<'idle' | 'uploading' | 'error'>('idle');
const analysisStatus = ref<'idle' | 'analyzing' | 'error'>('idle');
const serverStatus = ref<'connecting' | 'connected' | 'error'>('connecting');
const uploadProgress = ref(0);
const lastAnalysisTime = ref<Date | null>(null);
const lastEvent = ref<string | null>(null);

const route = useRoute();
const router = useRouter();
const spotStore = useSpotStore();

const code = computed(() => route.params.code as string);
const spot = computed(() => spotStore.spots[0]);
const feed = computed(() => spot.value?.videoFeeds?.find(f => f.connectionToken === code.value));
const spots = ref<any[]>([]);

const loading = ref(true);
const error = ref<string | null>(null);
const stream = ref<MediaStream | null>(null);
const streamId = ref<string>('');
const streamKey = ref<string>('');
const playbackId = ref<string>('');
const videoContainer = ref<HTMLDivElement | null>(null);
const isRecording = ref(false);
const isCameraActive = ref(false);
const videoRef = ref<HTMLVideoElement | null>(null);
const isVideoMounted = ref(false);
const connectionSteps = ref([
  { id: 'camera', label: 'Camera Access', status: 'pending' },
  { id: 'server', label: 'Server Connection', status: 'pending' },
  { id: 'recording', label: 'Recording Setup', status: 'pending' }
]);

const rtmpUrl = computed(() => 'rtmp://global-live.mux.com/app');
const streamingInfo = computed(() => ({
  rtmpUrl: rtmpUrl.value,
  streamKey: streamKey.value
}));

const handleCameraError = async (err: any) => {
  console.error('Camera error:', err.name, err.message);
  
  error.value = err.message || 'Failed to access camera. Please try again.';
  
  loading.value = false;
  isCameraActive.value = false;
  
  if (stream.value) {
    stream.value.getTracks().forEach(track => track.stop());
    stream.value = null;
  }
};

const startCamera = async () => {
  try {
    error.value = null;
    connectionSteps.value[0].status = 'loading';
    
    // Start camera immediately
    const constraints = {
      video: {
        width: { ideal: 1920, max: 1920 },
        height: { ideal: 1080, max: 1080 },
        frameRate: { ideal: 30, max: 30 },
        facingMode: 'environment'
      },
      audio: false
    };

    // Check if we're in a secure context
    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
      throw new Error('Camera access requires HTTPS. Please use a secure connection.');
    }

    // Check if getUserMedia is supported
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('Camera access is not supported in this browser.');
    }

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      stream.value = mediaStream;

      // Set up video preview immediately
      if (videoRef.value) {
        videoRef.value.srcObject = mediaStream;
        await videoRef.value.play();
        isCameraActive.value = true;
      }
    } catch (err: any) {
      switch (err.name) {
        case 'NotAllowedError':
          throw new Error('Camera access was denied. Please allow camera access and try again.');
        case 'NotFoundError':
          throw new Error('No camera found. Please ensure your device has a working camera.');
        case 'NotReadableError':
          throw new Error('Camera is in use by another application. Please close other apps using the camera.');
        case 'OverconstrainedError':
          // Try with lower quality constraints
          stream.value = await navigator.mediaDevices.getUserMedia({
            video: { width: 640, height: 480 },
            audio: false
          });
          if (videoRef.value) {
            videoRef.value.srcObject = stream.value;
            await videoRef.value.play();
            isCameraActive.value = true;
          }
          break;
        default:
          throw new Error(`Camera error: ${err.message || 'Could not start video source'}`);
      }
    }

    // Create Mux live stream
    connectionSteps.value[1].status = 'loading';
    const { streamId: newStreamId, streamKey: newStreamKey, playbackId: newPlaybackId } = 
      await MuxService.createLiveStream(spot.value?.id || '', feed.value?.id || '');

    streamId.value = newStreamId;
    streamKey.value = newStreamKey;
    playbackId.value = newPlaybackId;

    // Update feed with Mux stream info
    if (spot.value && feed.value) {
      connectionSteps.value[2].status = 'loading';
      await spotStore.updateVideoFeed(spot.value.id, feed.value.id, {
        muxStreamId: streamId.value,
        muxPlaybackId: playbackId.value,
        status: 'active'
      });

      // Start monitoring upload progress
      startUploadMonitoring();
    }

    // Show streaming instructions
    const instructions = `
To start streaming:
1. Open your streaming software (like OBS)
2. Add a new Stream
3. Set Service to "Custom"
4. Set Server to: ${rtmpUrl.value}
5. Set Stream Key to: ${streamKey.value}
6. Click "Start Streaming" in your software
    `;
    
    alert(instructions);

    // Show success message with streaming info
    error.value = null;
    connectionSteps.value.forEach(step => step.status = 'complete');

    // Add a helpful message
    alert(`Stream created successfully!\n\nTo start streaming, configure your streaming software with:\nRTMP URL: ${rtmpUrl.value}\nStream Key: ${streamKey.value}`);

    // Mark steps as complete
    connectionSteps.value[0].status = 'complete';
    connectionSteps.value[1].status = 'loading';

    // Wait for component to mount
    await nextTick();
    
    // Wait for video container to be available
    let attempts = 0;
    while (!videoContainer.value && attempts < 10) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    } 

    if (!videoContainer.value) {
      throw new Error('Video container not found');
    }

    serverStatus.value = 'connected';
    connectionSteps.value[1].status = 'complete';
    isRecording.value = true;
    uploadStatus.value = 'uploading';

    // Start analysis monitoring
    startAnalysisMonitoring();

    // Update feed status
    await spotStore.updateVideoFeedStatus(spot.value.id, feed.value.id, 'active');

  } catch (err) {
    console.error('Camera start error:', err.name, err.message);
    isCameraActive.value = false;
    serverStatus.value = 'error';
    handleCameraError(err);
  }
};

const startUploadMonitoring = () => {
  const updateProgress = async () => {
    if (streamId.value) {
      try {
        const status = await MuxService.getLiveStreamStatus(streamId.value);
        if (status.status === 'active' || status.status === 'idle') {
          uploadProgress.value = 100;
          uploadStatus.value = 'uploading';
          
          // Ensure feed status stays active
          if (spot.value && feed.value) {
            await spotStore.updateVideoFeed(spot.value.id, feed.value.id, {
              status: 'active'
            });
          }
        } else {
          uploadProgress.value = 0;
          uploadStatus.value = 'idle';
        }
      } catch (err) {
        console.error('Error checking stream status:', err);
        uploadStatus.value = 'error';
      }
    }
  };

  // Update more frequently initially
  updateProgress();
  const progressInterval = setInterval(updateProgress, 2000);

  onBeforeUnmount(() => {
    clearInterval(progressInterval);
  });
};

const startAnalysisMonitoring = () => {
  const checkAnalysis = async () => {
    if (!spot.value || !feed.value) return;
    
    try {
      analysisStatus.value = 'analyzing';
      // Capture current frame for analysis
      const video = videoRef.value;
      if (!video) return;

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(video, 0, 0);
      const imageData = canvas.toDataURL('image/jpeg', 0.8);

      // Simulate analysis with random events
      const events = [
        'Person detected',
        'Motion detected',
        'Object left behind',
        'Unusual activity'
      ];

      lastAnalysisTime.value = new Date();
      lastEvent.value = events[Math.floor(Math.random() * events.length)];
      analysisStatus.value = 'idle';
    } catch (err) {
      console.error('Analysis error:', err);
      analysisStatus.value = 'error';
    }
  };

  // Check analysis every 10 seconds
  const analysisInterval = setInterval(checkAnalysis, 10000);

  // Cleanup on unmount
  onBeforeUnmount(() => {
    clearInterval(analysisInterval);
  });
};

const stopCamera = () => {
  if (streamKey.value) {
    MuxService.stopLiveStream(streamKey.value).catch(console.error);
  }

  if (videoRef.value) {
    videoRef.value.srcObject = null;
  }

  if (stream.value) {
    stream.value.getTracks().forEach(track => track.stop());
    stream.value = null;
  }
  
  isRecording.value = false;
  isCameraActive.value = false;
  uploadStatus.value = 'idle';
  analysisStatus.value = 'idle';
  serverStatus.value = 'connecting';
  streamKey.value = '';
  playbackId.value = '';
};

const handleStopStream = async () => {
  try {
    if (spot.value && feed.value) {
      await spotStore.updateVideoFeedStatus(spot.value.id, feed.value.id, 'inactive');
    }
    serverStatus.value = 'connecting';
    // Spot data will already be loaded by router guard
    if (!spot.value || !feed.value) {
      router.replace('/404');
      return;
    }    

  } catch (err: any) {
    console.error('Connection setup error:', err);
    error.value = err.message || 'Failed to connect camera';
  } finally {
    loading.value = false;
  }
};

onBeforeUnmount(() => {
  stopCamera();
});
</script>

<template>
  <div class="fixed inset-0 bg-black overflow-hidden h-screen w-screen">
    <div class="relative w-full h-full">
      <!-- Video Container - Now truly fullscreen -->
      <div ref="videoContainer" class="fixed inset-0 w-full h-full">
        <video
          ref="videoRef"
          class="w-full h-full object-cover" 
          autoplay 
          playsInline
          muted
        />
      </div>

      <!-- Dark Overlay -->
      <div class="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/50"></div>

      <!-- Status Indicators -->
      <div class="fixed top-4 left-4 right-4 z-50 space-y-2">
        <!-- Server Status -->
        <div 
          class="inline-flex items-center space-x-2 px-3 py-2 text-sm text-white bg-black/40 backdrop-blur-sm rounded-full"
          :class="{
            'border border-neon-green/20': serverStatus === 'connected',
            'border border-yellow-500/20': serverStatus === 'connecting',
            'border border-red-500/20': serverStatus === 'error'
          }"
        >
          <ServerIcon class="h-4 w-4" :class="{
            'text-green-500 animate-pulse': serverStatus === 'connected',
            'text-yellow-500 animate-pulse': serverStatus === 'connecting',
            'text-red-500': serverStatus === 'error'
          }" />
          <span>{{ 
            serverStatus === 'connected' ? 'Connected to server' :
            serverStatus === 'connecting' ? 'Connecting to server...' :
            'Server connection error'
          }}</span>
        </div>

        <!-- Upload Status -->
        <div 
          v-if="isRecording"
          class="inline-flex items-center space-x-2 px-3 py-2 text-sm text-white bg-black/40 backdrop-blur-sm rounded-full border border-blue-500/20"
          :class="{
            'bg-blue-900/80': uploadStatus === 'uploading',
            'bg-red-900/80': uploadStatus === 'error'
          }"
        >
          <CloudArrowUpIcon class="h-4 w-4" :class="{
            'text-blue-500 animate-pulse': uploadStatus === 'uploading',
            'text-red-500': uploadStatus === 'error'
          }" />
          <span>{{ 
            uploadStatus === 'uploading' ? `Uploading video (${uploadProgress}%)` :
            uploadStatus === 'error' ? 'Upload error' : ''
          }}</span>
        </div>

        <!-- Analysis Status -->
        <div 
          v-if="isRecording && lastAnalysisTime"
          class="inline-flex items-center space-x-2 px-3 py-2 text-sm text-white bg-black/40 backdrop-blur-sm rounded-full border border-purple-500/20"
          :class="{
            'bg-purple-900/80': analysisStatus === 'analyzing',
            'bg-green-900/80': analysisStatus === 'idle',
            'bg-red-900/80': analysisStatus === 'error'
          }"
        >
          <SparklesIcon class="h-4 w-4" :class="{
            'text-purple-500 animate-pulse': analysisStatus === 'analyzing',
            'text-green-500': analysisStatus === 'idle',
            'text-red-500': analysisStatus === 'error'
          }" />
          <span>{{ 
            analysisStatus === 'analyzing' ? 'Analyzing video...' :
            analysisStatus === 'idle' ? `Last analysis: ${lastEvent}` :
            'Analysis error'
          }}</span>
        </div>

        <!-- RTMP URL and Stream Key -->
        <div v-if="streamKey" class="inline-flex items-center space-x-2 px-3 py-2 text-sm text-white bg-black/40 backdrop-blur-sm rounded-full border border-neon-green/20">
          <div class="flex flex-col space-y-1">
            <div class="flex items-center">
              <span class="text-gray-400 mr-2">RTMP URL:</span>
              <span class="text-neon-green">{{ rtmpUrl }}</span>
            </div>
            <div class="flex items-center">
              <span class="text-gray-400 mr-2">Stream Key:</span>
              <span class="text-neon-green">{{ streamKey }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="fixed inset-0 flex items-center justify-center bg-black">
        <div class="text-center">
          <div class="space-y-6">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-neon-green mx-auto"></div>
            <div class="space-y-4">
              <div v-for="step in connectionSteps" :key="step.id" class="flex items-center space-x-3">
                <div :class="[
                  'h-2 w-2 rounded-full',
                  step.status === 'complete' ? 'bg-neon-green' :
                  step.status === 'loading' ? 'bg-yellow-500 animate-pulse' :
                  'bg-gray-600'
                ]"></div>
                <span :class="[
                  'text-sm',
                  step.status === 'complete' ? 'text-neon-green' :
                  step.status === 'loading' ? 'text-yellow-500' :
                  'text-gray-500'
                ]">{{ step.label }}</span>
              </div>
            </div>
            <p class="text-sm text-gray-500">Please wait while we establish a secure connection</p>
          </div>
        </div>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="fixed inset-0 flex items-center justify-center bg-black">
        <div class="text-center">
          <ExclamationTriangleIcon class="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 class="text-lg font-medium text-white mb-2">Connection Error</h3>
          <p class="text-red-400 mb-4">{{ error }}</p>
          <button
            @click="window.location.reload()"
            class="inline-flex items-center px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
          >
            <span>Try Again</span>
          </button>
        </div>
      </div>

      <!-- Start Camera Overlay -->
      <div 
        v-if="!isCameraActive || !stream" 
        class="fixed inset-0 flex items-center justify-center bg-black/90 backdrop-blur-sm z-50"
      >
        <div class="text-center">
          <VideoCameraIcon class="h-12 w-12 text-neon-green mx-auto mb-4" />
          <h3 class="text-xl font-medium text-white mb-2">Camera Access Required</h3>
          <p class="text-gray-400 mb-6 max-w-md mx-auto">
            Click the button below to start streaming.
            <br>
            <span class="text-sm">You'll need to allow camera access when prompted.</span>
          </p>
          <button
            @click="startCamera"
            class="inline-flex items-center px-6 py-3 bg-neon-green text-black rounded-lg hover:bg-neon-green/90 transition-all duration-200 shadow-lg hover:shadow-neon-green/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <PlayIcon class="h-5 w-5 mr-2" />
            Start Streaming
          </button>
          <p class="mt-4 text-sm text-gray-500">Make sure your camera is properly connected and enabled</p>
        </div>
      </div>
        <!-- Status Overlays -->
      <div v-if="isCameraActive" class="absolute inset-0 pointer-events-none">
        <!-- Connection Status Overlay -->
        <div class="fixed top-4 right-4 pointer-events-auto">
          <button
            @click="handleStopStream"
            class="inline-flex items-center px-4 py-2 bg-black/40 backdrop-blur-sm hover:bg-black/60 rounded-full text-white transition-all duration-200 border border-red-500/20"
          >
            <StopIcon class="h-4 w-4 mr-1" />
            <span>Stop Streaming</span>
          </button>
        </div>

        <!-- Recording Indicator -->
        <div class="fixed top-4 left-4 pointer-events-none">
          <div class="flex items-center space-x-2 px-3 py-1.5 bg-black/40 backdrop-blur-sm rounded-full border border-red-500/20">
            <div class="flex items-center space-x-2">
              <div class="h-2 w-2 rounded-full bg-red-500 animate-pulse"></div>
              <span class="text-xs text-white">REC</span>
            </div>
            <div class="text-xs text-gray-400 border-l border-gray-600 pl-2 ml-2">
              {{ new Date().toLocaleTimeString() }}
            </div>
          </div>
        </div>

        <!-- Network Status -->
        <div class="fixed bottom-4 left-4 pointer-events-none">
          <div class="flex items-center space-x-2 px-3 py-1.5 bg-black/40 backdrop-blur-sm rounded-full">
            <div class="flex items-center space-x-1">
              <div v-for="i in 4" :key="i" 
                   :class="[
                     'h-2 w-1 rounded-full',
                     i <= 3 ? 'bg-neon-green' : 'bg-gray-600'
                   ]"
              ></div>
            </div>
            <span class="text-xs text-gray-400">Good Connection</span>
          </div>
        </div>
      </div>

      <!-- Streaming Instructions -->
      <div v-if="streamKey" class="fixed bottom-4 right-4 p-4 bg-black/80 backdrop-blur-sm rounded-xl border border-neon-green/20 max-w-md">
        <h3 class="text-white font-medium mb-2">Streaming Instructions</h3>
        <div class="space-y-2 text-sm">
          <p class="text-gray-400">Configure your streaming software with:</p>
          <div class="bg-black/50 p-2 rounded">
            <div class="flex justify-between items-center mb-2">
              <span class="text-gray-400">RTMP URL:</span>
              <code class="text-neon-green">{{ rtmpUrl }}</code>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-gray-400">Stream Key:</span>
              <code class="text-neon-green">{{ streamKey }}</code>
            </div>
          </div>
          <p class="text-yellow-400 text-xs">
            Start streaming in your software to activate the feed
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.backdrop-blur-sm {
  backdrop-filter: blur(8px);
}

.h-screen {
  height: 100vh;
  height: 100dvh;
}

.w-screen {
  width: 100vw;
  width: 100dvw;
}
</style>