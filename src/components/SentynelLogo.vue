<script setup lang="ts">
defineProps<{
  class?: string;
  color?: string;
  minimal?: boolean;
}>();
</script>

<template>
  <div class="flex items-center space-x-2">
    <!-- Icon -->
    <svg
      v-if="minimal"
      class="h-full"
      viewBox="0 0 40 40"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        :fill="color || 'currentColor'"
        d="M20 4L4 36h32L20 4zm0 8l10 20H10l10-20z"
      />
    </svg>
    <!-- Full Logo -->
    <svg
      v-else
      :class="class"
      viewBox="0 0 200 40"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        :fill="color || 'currentColor'"
        d="M40 8L24 40h32L40 8zm0 8l10 20H30l10-20z"
      />
      <path
        :fill="color || 'currentColor'"
        d="M80 12h60v4h-60zM80 24h60v4h-60z"
      />
    </svg>
  </div>
</template>