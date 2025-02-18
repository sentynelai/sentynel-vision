<script setup lang="ts">
import { ref, computed, nextTick, onMounted } from 'vue';
import { nanoid } from 'nanoid';
import QrcodeVue from 'qrcode.vue';
import { CameraIcon, QrCodeIcon, ShareIcon, XMarkIcon } from '@heroicons/vue/24/outline';
import type { VideoFeed } from '../stores/spots';

const props = defineProps<{
  show: boolean;
  spotName: string;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'save', camera: Omit<VideoFeed, 'id' | 'status' | 'lastAnalysis' | 'connectionToken' | 'shareUrl'>): void;
}>();

// Generate a cool camera name
const generateCameraName = () => {
  const prefixes = ['Sentinel', 'Guardian', 'Watchman', 'Scout', 'Monitor'];
  const locations = ['North', 'South', 'East', 'West', 'Central'];
  const types = ['Eye', 'Lens', 'View', 'Cam', 'Vision'];
  
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const location = locations[Math.floor(Math.random() * locations.length)];
  const type = types[Math.floor(Math.random() * types.length)];
  const id = nanoid(4).toUpperCase();
  
  return `${prefix} ${location} ${type} ${id}`;
};

const step = ref(1);
const camera = ref({
  name: generateCameraName(),
  type: 'mobile' as const,
  url: '',
  demoUrl: ''
});

const isSubmitting = ref(false);
const error = ref<string | null>(null);
const shareUrl = ref('');
const showForm = ref(false);
const showSuccess = ref(false);

const isValid = computed(() => {
  if (!camera.value.name) return false;
  if (camera.value.type === 'mobile') return true;
  if (camera.value.type === 'demo') return true;
  return !!camera.value.url;
});

const handleNext = async () => {
  if (step.value === 1 && isValid.value) {
    isSubmitting.value = true;
    error.value = null;
    
    try {
      showForm.value = false;
      await emit('save', camera.value);
      await nextTick();
      showSuccess.value = true;
    } catch (err: any) {
      error.value = err.message || 'Failed to add camera';
      showForm.value = true;
    } finally {
      isSubmitting.value = false;
    }
  }
};

const handleClose = () => {
  step.value = 1;
  showForm.value = false;
  showSuccess.value = false;
  camera.value = {
    name: generateCameraName(),
    type: 'mobile',
    url: '',
    demoUrl: ''
  };
  error.value = null;
  emit('close');
};

const copyToClipboard = async () => {
  try {
    await navigator.clipboard.writeText(shareUrl.value);
  } catch (err) {
    console.error('Failed to copy:', err);
  }
};

// Show form with animation after mount
onMounted(() => {
  setTimeout(() => {
    showForm.value = true;
  }, 100);
});

</script>

<template>
  <div v-if="show" class="modal-backdrop">
    <div class="card max-w-lg w-full">
      <!-- Header -->
      <div 
        class="flex items-center justify-between p-6 border-b border-neon-green/20 transition-all duration-300"
        :class="{ 'opacity-0': !showForm && !showSuccess, 'opacity-100': showForm || showSuccess }"
      >
        <h3 class="text-xl font-semibold text-white">
          {{ showSuccess ? 'Connect Camera' : 'Add New Camera' }}
        </h3>
        <button 
          @click="handleClose"
          class="text-gray-400 hover:text-white transition-colors"
        >
          <XMarkIcon class="h-6 w-6" />
        </button>
      </div>
      
      <!-- Step 1: Camera Details -->
      <div 
        v-if="!showSuccess" 
        class="p-6 space-y-6 transition-all duration-300 transform"
        :class="{ 
          'opacity-0 translate-x-8': !showForm,
          'opacity-100 translate-x-0': showForm
        }"
      >
        <div>
          <label class="block text-sm font-medium text-gray-200 mb-2">Camera Name</label>
          <div class="flex space-x-2">
            <input
              v-model="camera.name"
              type="text"
              class="block flex-1 rounded-lg"
              placeholder="e.g., Front Door Camera"
              required
            />
            <button
              @click="camera.name = generateCameraName()"
              class="px-3 py-2 rounded-lg bg-gray-800 text-gray-400 hover:text-white transition-colors"
              title="Generate random name"
            >
              🎲
            </button>
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-200 mb-2">Camera Type</label>
          <select
            v-model="camera.type"
            class="block w-full rounded-lg"
            required
          >
            <option value="mobile">Mobile Device</option>
            <option value="ip-camera">IP Camera</option>
            <option value="dvr">DVR/NVR</option>
            <option value="demo">Demo Camera</option>
          </select>
        </div>

        <div v-if="camera.type !== 'mobile' && camera.type !== 'demo'">
          <label class="block text-sm font-medium text-gray-200 mb-2">Stream URL</label>
          <input
            v-model="camera.url"
            type="text"
            class="block w-full rounded-lg"
            placeholder="rtsp:// or http:// stream URL"
          />
          <p class="mt-2 text-sm text-gray-400">
            For IP cameras, enter the RTSP or HTTP stream URL. For DVR/NVR systems, enter the channel URL.
          </p>
        </div>

        <!-- Error Message -->
        <div v-if="error" class="bg-red-900/50 border border-red-500/50 rounded-lg p-4">
          <p class="text-sm text-red-400">{{ error }}</p>
        </div>

        <!-- Action Buttons -->
        <div class="flex justify-end space-x-3">
          <button
            type="button"
            @click="handleClose"
            class="btn btn-outline"
          >
            Cancel
          </button>
          <button
            @click="handleNext"
            class="btn btn-primary relative"
            :disabled="!isValid || isSubmitting"
          >
            <span :class="{ 'opacity-0': isSubmitting }">
              Continue
            </span>
            <div 
              v-if="isSubmitting" 
              class="absolute inset-0 flex items-center justify-center"
            >
              <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-black"></div>
            </div>
          </button>
        </div>
      </div>

      <!-- Step 2: Connection Details -->
      <div 
        v-else 
        class="p-6 space-y-6 transition-all duration-300 transform"
        :class="{
          'opacity-0 -translate-x-8': !showSuccess,
          'opacity-100 translate-x-0': showSuccess
        }"
      >
        <div class="text-center">
          <div class="inline-flex items-center justify-center h-12 w-12 rounded-full bg-neon-green/10 text-neon-green mb-4">
            <CameraIcon class="h-6 w-6" />
          </div>
          <h3 class="text-lg font-medium text-white mb-2">Camera Added Successfully!</h3>
          <p class="text-gray-400">{{ camera.name }} is ready to be connected</p>
        </div>

        <div v-if="camera.type === 'mobile'" class="flex justify-center">
          <div class="p-4 bg-white rounded-lg">
            <QrcodeVue :value="shareUrl" :size="200" level="H" />
          </div>
        </div>

        <div class="relative">
          <input
            type="text"
            :value="shareUrl"
            readonly
            class="block w-full pr-24 rounded-lg bg-gray-800 border-gray-700 text-white"
          />
          <button
            @click="copyToClipboard"
            class="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center px-3 py-1 text-sm font-medium text-black bg-neon-green rounded-md hover:bg-neon-green/90 transition-colors"
          >
            Copy
          </button>
        </div>

        <div class="bg-gray-800 rounded-lg p-4">
          <h4 class="text-sm font-medium text-white mb-2">How to connect:</h4>
          <ol class="text-sm text-gray-400 space-y-2 list-decimal list-inside">
            <li>Scan the QR code or open the link on your mobile device</li>
            <li>Allow camera access when prompted</li>
            <li>Position your device to capture the desired view</li>
            <li>Keep the browser tab open to maintain the connection</li>
          </ol>
        </div>

        <div class="flex justify-end">
          <button
            @click="handleClose"
            class="btn btn-primary"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-backdrop {
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    backdrop-filter: blur(0);
  }
  to {
    opacity: 1;
    backdrop-filter: blur(8px);
  }
}
</style>