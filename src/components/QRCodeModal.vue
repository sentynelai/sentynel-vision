<script setup lang="ts">
import { ref } from 'vue';
import QrcodeVue from 'qrcode.vue';

defineProps<{
  url: string;
  show: boolean;
}>();

defineEmits<{
  (e: 'close'): void;
}>();
</script>

<template>
  <div v-if="show" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
    <div class="bg-white rounded-lg p-6 max-w-sm w-full">
      <div class="text-center">
        <h3 class="text-lg font-medium mb-4">Scan QR Code</h3>
        <div class="flex justify-center mb-4">
          <QrcodeVue :value="url" :size="200" level="H" />
        </div>
        <p class="text-sm text-gray-500 mb-4">
          Scan this QR code with your mobile device to start streaming
        </p>
        <div class="mt-4 flex justify-end">
          <button
            @click="$emit('close')"
            class="inline-flex justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  </div>
</template>