<!-- Video Uploader Component -->
<script setup lang="ts">
import { ref, computed } from 'vue';
import { VideoStorageService } from '../services/videoStorage';
import { useAuthStore } from '../stores/auth';
import { CloudArrowUpIcon, XMarkIcon } from '@heroicons/vue/24/outline';

const props = defineProps<{
  maxSize?: number; // in bytes
  allowedTypes?: string[];
}>();

const emit = defineEmits<{
  (e: 'upload-success', metadata: any): void;
  (e: 'upload-error', error: Error): void;
}>();

const authStore = useAuthStore();

const fileInput = ref<HTMLInputElement | null>(null);
const selectedFile = ref<File | null>(null);
const previewUrl = ref<string | null>(null);
const isUploading = ref(false);
const uploadProgress = ref(0);
const error = ref<string | null>(null);
const title = ref('');
const description = ref('');
const isPrivate = ref(false);

const maxSizeFormatted = computed(() => {
  const size = props.maxSize || VideoStorageService.MAX_FILE_SIZE;
  return `${(size / (1024 * 1024)).toFixed(0)}MB`;
});

const allowedTypesFormatted = computed(() => {
  const types = props.allowedTypes || VideoStorageService.SUPPORTED_FORMATS;
  return types.map(type => type.split('/')[1].toUpperCase()).join(', ');
});

const handleFileSelect = (event: Event) => {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  
  if (!file) return;
  
  // Validate file type
  if (!props.allowedTypes?.includes(file.type)) {
    error.value = `Invalid file type. Allowed types: ${allowedTypesFormatted.value}`;
    return;
  }
  
  // Validate file size
  if (file.size > (props.maxSize || VideoStorageService.MAX_FILE_SIZE)) {
    error.value = `File size exceeds maximum limit of ${maxSizeFormatted.value}`;
    return;
  }
  
  selectedFile.value = file;
  previewUrl.value = URL.createObjectURL(file);
  error.value = null;
};

const clearSelection = () => {
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value);
  }
  selectedFile.value = null;
  previewUrl.value = null;
  if (fileInput.value) {
    fileInput.value.value = '';
  }
  title.value = '';
  description.value = '';
  isPrivate.value = false;
  error.value = null;
};

const handleUpload = async () => {
  if (!selectedFile.value || !authStore.user) return;
  
  if (!title.value.trim()) {
    error.value = 'Please enter a title for the video';
    return;
  }
  
  try {
    isUploading.value = true;
    error.value = null;
    
    // Get video duration
    const duration = await new Promise<number>((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => resolve(video.duration);
      video.src = previewUrl.value!;
    });
    
    // Upload video
    const metadata = await VideoStorageService.uploadVideo(selectedFile.value, {
      userId: authStore.user.uid,
      title: title.value.trim(),
      description: description.value.trim(),
      duration,
      isPrivate: isPrivate.value
    });
    
    emit('upload-success', metadata);
    clearSelection();
  } catch (err: any) {
    console.error('Upload error:', err);
    error.value = err.message || 'Failed to upload video';
    emit('upload-error', err);
  } finally {
    isUploading.value = false;
    uploadProgress.value = 0;
  }
};
</script>

<template>
  <div class="space-y-6">
    <!-- File Selection Area -->
    <div 
      class="border-2 border-dashed border-gray-700 rounded-lg p-6"
      :class="{ 'border-red-500': error }"
    >
      <div v-if="!selectedFile" class="text-center">
        <CloudArrowUpIcon class="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p class="text-gray-400 mb-2">
          Drag and drop your video here, or
          <button
            @click="fileInput?.click()"
            class="text-neon-green hover:text-neon-green/80 transition-colors"
          >
            browse
          </button>
        </p>
        <p class="text-sm text-gray-500">
          Maximum file size: {{ maxSizeFormatted }}
          <br>
          Supported formats: {{ allowedTypesFormatted }}
        </p>
        <input
          ref="fileInput"
          type="file"
          accept="video/*"
          class="hidden"
          @change="handleFileSelect"
        />
      </div>

      <!-- Video Preview -->
      <div v-else class="space-y-4">
        <div class="relative aspect-video bg-gray-900 rounded-lg overflow-hidden">
          <video
            :src="previewUrl"
            class="w-full h-full object-contain"
            controls
          ></video>
          <button
            @click="clearSelection"
            class="absolute top-2 right-2 p-1 bg-black/60 rounded-full text-white hover:bg-black/80 transition-colors"
          >
            <XMarkIcon class="h-5 w-5" />
          </button>
        </div>

        <!-- Video Details Form -->
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-200 mb-2">
              Title
            </label>
            <input
              v-model="title"
              type="text"
              class="block w-full rounded-lg"
              placeholder="Enter video title"
              required
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-200 mb-2">
              Description
            </label>
            <textarea
              v-model="description"
              rows="3"
              class="block w-full rounded-lg"
              placeholder="Enter video description (optional)"
            ></textarea>
          </div>

          <div class="flex items-center">
            <input
              v-model="isPrivate"
              type="checkbox"
              class="rounded border-gray-700 text-neon-green focus:ring-neon-green bg-gray-800"
            />
            <label class="ml-2 text-sm text-gray-200">
              Make this video private
            </label>
          </div>
        </div>
      </div>
    </div>

    <!-- Error Message -->
    <div 
      v-if="error"
      class="bg-red-900/50 border border-red-500/50 rounded-lg p-4"
    >
      <p class="text-sm text-red-400">{{ error }}</p>
    </div>

    <!-- Upload Button -->
    <div class="flex justify-end">
      <button
        v-if="selectedFile"
        @click="handleUpload"
        :disabled="isUploading || !title.trim()"
        class="btn btn-primary relative"
      >
        <span :class="{ 'opacity-0': isUploading }">
          Upload Video
        </span>
        <div 
          v-if="isUploading" 
          class="absolute inset-0 flex items-center justify-center"
        >
          <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-black"></div>
        </div>
      </button>
    </div>
  </div>
</template>