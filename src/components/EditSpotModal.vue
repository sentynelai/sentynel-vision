<script setup lang="ts">
import { ref } from 'vue';
import { XMarkIcon } from '@heroicons/vue/24/outline';
import type { Spot } from '../stores/spots';

const props = defineProps<{
  show: boolean;
  spot: Spot;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'save', updates: Partial<Spot>): void;
  (e: 'delete'): void;
}>();

const name = ref(props.spot.name);
const customInstructions = ref(props.spot.assistant.customInstructions);

const handleSave = () => {
  emit('save', {
    name: name.value,
    assistant: {
      ...props.spot.assistant,
      customInstructions: customInstructions.value
    }
  });
};

const confirmDelete = () => {
  if (confirm('Are you sure you want to delete this spot? This action cannot be undone.')) {
    emit('delete');
  }
};
</script>

<template>
  <div v-if="show" class="modal-backdrop">
    <div class="card max-w-lg w-full">
      <div class="flex items-center justify-between p-6 border-b border-neon-green/20">
        <h3 class="text-xl font-semibold text-white">Edit Spot</h3>
        <button 
          @click="$emit('close')"
          class="text-gray-400 hover:text-white transition-colors"
        >
          <XMarkIcon class="h-6 w-6" />
        </button>
      </div>
      
      <form @submit.prevent="handleSave" class="p-6 space-y-6">
        <div>
          <label class="block text-sm font-medium text-gray-200 mb-2">Spot Name</label>
          <input
            v-model="name"
            type="text"
            class="block w-full rounded-lg"
            placeholder="e.g., Main Store Floor"
            required
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-200 mb-2">Analysis Instructions</label>
          <textarea
            v-model="customInstructions"
            rows="4"
            class="block w-full rounded-lg"
            placeholder="Describe what you want to monitor and analyze in this space..."
          ></textarea>
        </div>

        <div class="flex justify-between">
          <button
            type="button"
            @click="confirmDelete"
            class="btn bg-red-500 hover:bg-red-600 text-white"
          >
            Delete Spot
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