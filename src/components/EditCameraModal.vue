<script setup lang="ts">
import { ref } from 'vue';
import { XMarkIcon } from '@heroicons/vue/24/outline';
import type { VideoFeed } from '../stores/spots';

const props = defineProps<{
  show: boolean;
  camera: VideoFeed;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'save', updates: { name: string; type: VideoFeed['type']; url: string }): void;
  (e: 'delete'): void;
}>();

const name = ref(props.camera.name);
const type = ref(props.camera.type);
const url = ref(props.camera.url);
const error = ref<string | null>(null);

const handleSave = () => {
  error.value = null;
  
  if (!name.value.trim()) {
    error.value = 'Camera name is required';
    return;
  }
  
  if (type.value !== 'mobile' && type.value !== 'demo' && !url.value.trim()) {
    error.value = 'Stream URL is required for IP cameras and DVR/NVR systems';
    return;
  }
  
  emit('save', {
    name: name.value,
    type: type.value,
    url: url.value
  });
};

const confirmDelete = () => {
  if (confirm('Are you sure you want to delete this camera? This action cannot be undone.')) {
    emit('delete');
  }
};
</script>

<template>
  <div v-if="show" class="modal-backdrop">
    <div class="card max-w-lg w-full">
      <div class="flex items-center justify-between p-6 border-b border-neon-green/20">
        <h3 class="text-xl font-semibold text-white">Edit Camera</h3>
        <button 
          @click="$emit('close')"
          class="text-gray-400 hover:text-white transition-colors"
        >
          <XMarkIcon class="h-6 w-6" />
        </button>
      </div>
      
      <form @submit.prevent="handleSave" class="p-6 space-y-6">
        <!-- Error Message -->
        <div v-if="error" class="bg-red-900/50 border border-red-500/50 rounded-lg p-4">
          <p class="text-sm text-red-400">{{ error }}</p>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-200 mb-2">Camera Name</label>
          <input
            v-model="name"
            type="text"
            class="block w-full rounded-lg"
            placeholder="e.g., Front Door Camera"
            required
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-200 mb-2">Camera Type</label>
          <select
            v-model="type"
            class="block w-full rounded-lg"
            required
          >
            <option value="mobile">Mobile Device</option>
            <option value="ip-camera">IP Camera</option>
            <option value="dvr">DVR/NVR</option>
            <option value="demo">Demo Camera</option>
          </select>
        </div>

        <div v-if="type !== 'mobile'">
          <label class="block text-sm font-medium text-gray-200 mb-2">Stream URL</label>
          <input
            v-model="url"
            type="text"
            class="block w-full rounded-lg"
            placeholder="rtsp:// or http:// stream URL"
          />
          <p class="mt-2 text-sm text-gray-400">
            For IP cameras, enter the RTSP or HTTP stream URL. For DVR/NVR systems, enter the channel URL.
          </p>
        </div>

        <div class="flex justify-between">
          <button
            type="button"
            @click="confirmDelete"
            class="btn bg-red-500 hover:bg-red-600 text-white"
          >
            Delete Camera
          </button>

          <div class="space-x-3">
            <button
              type="button"
              @click="$emit('close')"
              class="btn btn-outline"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="btn btn-primary"
            >
              Save Changes
            </button>
          </div>
        </div>
      </form>
    </div>
  </div>
</template>