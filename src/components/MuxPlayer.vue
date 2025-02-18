<!-- Mux Video Player Component -->
<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
import MuxPlayer from '@mux/mux-player';
import Hls from 'hls.js';

const props = defineProps<{
  playbackId: string;
  type?: 'live' | 'vod';
  poster?: string;
  autoPlay?: boolean;
  muted?: boolean;
}>();

const playerRef = ref<HTMLVideoElement | null>(null);
const hls = ref<Hls | null>(null);

const initializePlayer = () => {
  if (!playerRef.value) return;

  const video = playerRef.value;
  const streamUrl = `https://stream.mux.com/${props.playbackId}.m3u8`;

  // Use Hls.js if supported
  if (Hls.isSupported()) {
    hls.value = new Hls({
      enableWorker: true,
      lowLatencyMode: props.type === 'live',
      backBufferLength: props.type === 'live' ? 30 : 60
    });

    hls.value.loadSource(streamUrl);
    hls.value.attachMedia(video);
    
    hls.value.on(Hls.Events.MANIFEST_PARSED, () => {
      if (props.autoPlay) {
        video.play().catch(console.error);
      }
    });
  }
  // Otherwise use native HLS support
  else if (video.canPlayType('application/vnd.apple.mpegurl')) {
    video.src = streamUrl;
    if (props.autoPlay) {
      video.play().catch(console.error);
    }
  }
};

// Clean up Hls.js instance
const cleanup = () => {
  if (hls.value) {
    hls.value.destroy();
    hls.value = null;
  }
};

// Watch for playbackId changes
watch(() => props.playbackId, () => {
  cleanup();
  initializePlayer();
});

onMounted(() => {
  initializePlayer();
});

onBeforeUnmount(() => {
  cleanup();
});
</script>

<template>
  <div class="relative w-full h-full">
    <video
      ref="playerRef"
      class="w-full h-full"
      :poster="poster"
      :muted="muted"
      :autoplay="autoPlay"
      playsinline
      controls
    ></video>
  </div>
</template>