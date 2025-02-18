<script setup lang="ts">
import { ref, computed } from 'vue';
import QrcodeVue from 'qrcode.vue';
import { ClipboardDocumentIcon, ShareIcon, VideoCameraIcon, SignalIcon, XMarkIcon, EyeIcon } from '@heroicons/vue/24/outline';

const props = defineProps<{
  show: boolean;
  url: string;
  spotName: string;
  status?: 'active' | 'inactive';
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const copied = ref(false);
const showStreamUrl = ref(false);

// Ensure we have a valid URL to share
const shareableUrl = computed(() => {
  if (!props.url) return '';
  
  const baseUrl = window.location.origin;
  
  try {
    // If it's already a full URL, return it
    if (props.url.startsWith('http')) {
      return props.url;
    }
    // Otherwise, combine with base URL
    return `${baseUrl}${props.url.startsWith('/') ? '' : '/'}${props.url}`;
  } catch (e) {
    console.error('Invalid URL:', e);
    return `${baseUrl}${props.url.startsWith('/') ? '' : '/'}${props.url}`;
  }
});

const openCameraPage = () => {
  if (shareableUrl.value) {
    window.open(shareableUrl.value, '_blank');
  }
};

const isDemo = computed(() => {
  return props.url.includes('youtube.com') || props.url.includes('youtu.be');
});

const copyToClipboard = async () => {
  try {
    await navigator.clipboard.writeText(shareableUrl.value || props.url);
    copied.value = true;
    setTimeout(() => {
      copied.value = false;
    }, 2000);
  } catch (err) {
    console.error('Failed to copy:', err);
  }
};

const shareToWhatsApp = () => {
  const text = `Check out this camera feed from ${props.spotName}: ${shareableUrl.value}`;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
  window.open(whatsappUrl, '_blank');
};

const shareUrl = () => {
  if (navigator.canShare && navigator.canShare({ url: shareableUrl.value })) {
    try {
      navigator.share({
        title: `${props.spotName} - Camera Feed`,
        text: `Check out this camera feed from ${props.spotName}`,
        url: shareableUrl.value
      }).catch(err => {
        if (err.name !== 'AbortError') {
          console.error('Share failed:', err);
          copyToClipboard();
        }
      });
    } catch (err) {
      console.error('Share failed:', err);
      copyToClipboard();
    }
  } else {
    // Fallback to copy if Web Share API is not available
    copyToClipboard();
  }
};

const getStreamUrl = () => {
  if (isDemo.value) {
    return props.url;
  }
  try {
    // Extract the feed ID from the URL path
    const pathParts = props.url.split('/');
    const feedId = pathParts[pathParts.length - 2]; // Second to last part should be the feed ID
    
    // Construct streaming URL
    return `https://stream.sentynel.vision/live/${feedId}`;
  } catch (err) {
    console.error('Error generating stream URL:', err);
    return props.url;
  }
};
</script>

<template>
  <div v-if="show" class="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
    <div class="bg-gray-900 rounded-xl border border-neon-green/20 shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
      <!-- Header -->
      <div class="sticky top-0 bg-gray-900 p-6 border-b border-neon-green/20">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-xl font-semibold text-white">Share Camera Feed</h3>
            <p class="mt-1 text-sm text-gray-400">{{ spotName }}</p>
          </div>
          <div class="flex items-center space-x-4">
            <div :class="[
              'flex items-center space-x-1 px-2 py-1 rounded-full text-xs',
              status === 'active' ? 'bg-neon-green/10 text-neon-green' : 'bg-gray-800 text-gray-400'
            ]">
              <SignalIcon class="h-4 w-4" />
              <span>{{ status === 'active' ? 'Online' : 'Offline' }}</span>
            </div>
            <button 
              @click="$emit('close')"
              class="text-gray-400 hover:text-white transition-colors"
            >
              <XMarkIcon class="h-6 w-6" />
            </button>
          </div>
        </div>
      </div>

      <!-- Content -->
      <div class="p-6 space-y-6">
        <!-- QR Code -->
        <div v-if="!isDemo" class="flex justify-center">
          <div class="p-4 bg-white rounded-lg">
            <QrcodeVue :value="shareableUrl" :size="200" level="H" renderAs="svg" />
          </div>
        </div>

        <!-- URL Input -->
        <div class="relative">
          <input
            type="text"
            :value="shareableUrl"
            readonly
            class="block w-full pr-24 rounded-lg bg-gray-800 border-gray-700 text-white shadow-sm focus:border-neon-green focus:ring-neon-green"
          />
          <button
            @click="copyToClipboard"
            class="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-black bg-neon-green hover:bg-neon-green/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-neon-green transition-all duration-200"
          >
            <ClipboardDocumentIcon class="h-4 w-4 mr-1" />
            {{ copied ? 'Copied!' : 'Copy' }}
          </button>
        </div>

        <!-- Stream URL Toggle -->
        <div>
          <button
            @click="showStreamUrl = !showStreamUrl"
            class="text-sm text-gray-400 hover:text-white transition-colors flex items-center space-x-1"
          >
            <VideoCameraIcon class="h-4 w-4" />
            <span>{{ showStreamUrl ? 'Hide' : 'Show' }} Stream URL</span>
          </button>
          
          <div v-if="showStreamUrl" class="mt-2">
            <input
              type="text"
              :value="getStreamUrl()"
              readonly
              class="block w-full rounded-lg bg-gray-800 border-gray-700 text-white shadow-sm focus:border-neon-green focus:ring-neon-green text-sm"
            />
            <p class="mt-1 text-xs text-gray-500">
              {{ isDemo ? 'YouTube video URL' : 'Use this URL to connect external streaming software' }}
            </p>
          </div>
        </div>

        <!-- Share Buttons -->
        <div class="flex space-x-3">
          <button
            @click="openCameraPage"
            class="flex-1 inline-flex items-center justify-center px-4 py-2 border border-neon-green/50 rounded-lg text-white bg-transparent hover:bg-neon-green/10 transition-colors duration-200"
          >
            <EyeIcon class="h-5 w-5 mr-2" />
            Open here
          </button>
          <button
            @click="shareToWhatsApp"
            class="flex-1 inline-flex items-center justify-center px-4 py-2 border border-neon-green/50 rounded-lg text-white bg-transparent hover:bg-neon-green/10 transition-colors duration-200"
          >
            <svg class="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
            </svg>
            WhatsApp
          </button>
          <button
            @click="shareUrl"
            class="flex-1 inline-flex items-center justify-center px-4 py-2 border border-neon-green/50 rounded-lg text-white bg-transparent hover:bg-neon-green/10 transition-colors duration-200"
          >
            <ShareIcon class="h-5 w-5 mr-2" />
            Share
          </button>
        </div>

        <!-- Instructions -->
        <div v-if="!isDemo" class="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <h4 class="text-sm font-medium text-white mb-2">How to connect:</h4>
          <ol class="text-sm text-gray-400 space-y-2 list-decimal list-inside">
            <li>Scan the QR code or open the link on your mobile device</li>
            <li>Allow camera access when prompted</li>
            <li>Position your device to capture the desired view</li>
            <li>Keep the browser tab open to maintain the connection</li>
          </ol>
        </div>
      </div>
    </div>
  </div>
</template>