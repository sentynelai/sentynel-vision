<script setup lang="ts">
import { XMarkIcon, ExclamationTriangleIcon } from '@heroicons/vue/24/outline';

defineProps<{
  show: boolean;
  title: string;
  message: string;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'confirm'): void;
}>();
</script>

<template>
  <div v-if="show" class="modal-backdrop">
    <div class="card max-w-md w-full">
      <div class="p-6">
        <div class="flex items-center justify-center mb-4">
          <div class="h-12 w-12 rounded-full bg-red-900/50 flex items-center justify-center">
            <ExclamationTriangleIcon class="h-6 w-6 text-red-500" />
          </div>
        </div>
        
        <h3 class="text-lg font-medium text-white text-center mb-2">
          {{ title }}
        </h3>
        <p class="text-gray-400 text-center mb-6">
          {{ message }}
        </p>

        <div class="flex justify-end space-x-3">
          <button
            @click="$emit('close')"
            class="btn btn-outline"
          >
            Cancel
          </button>
          <button
            @click="$emit('confirm')"
            class="btn bg-red-500 hover:bg-red-600 text-white"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  </div>
</template>