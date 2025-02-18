<script setup lang="ts">
import { computed } from 'vue';
import { SignalIcon, VideoCameraIcon, ExclamationTriangleIcon } from '@heroicons/vue/24/outline';

const props = defineProps<{
  status: 'active' | 'inactive';
  type: 'mobile' | 'ip-camera' | 'dvr';
  signal?: number;
}>();

const statusColor = computed(() => {
  if (props.status === 'active') {
    if (props.signal && props.signal < 50) {
      return 'text-yellow-400';
    }
    return 'text-neon-green';
  }
  return 'text-gray-600';
});

const statusText = computed(() => {
  if (props.status === 'active') {
    if (props.signal && props.signal < 50) {
      return 'Weak Signal';
    }
    return 'Online';
  }
  return 'Offline';
});

const icon = computed(() => {
  if (props.status === 'inactive') {
    return ExclamationTriangleIcon;
  }
  if (props.signal && props.signal < 50) {
    return SignalIcon;
  }
  return VideoCameraIcon;
});
</script>

<template>
  <div :class="[
    'inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs',
    `${statusColor} bg-${statusColor}/10`
  ]">
    <component :is="icon" class="h-4 w-4" />
    <span>{{ statusText }}</span>
  </div>
</template>