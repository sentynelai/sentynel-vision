<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useSpotStore } from '../stores/spots';
import ShareFeedModal from '../components/ShareFeedModal.vue';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal.vue';
import { 
  VideoCameraIcon, 
  PlusIcon,
  BellAlertIcon,
  ChartBarIcon,
  XMarkIcon,
  ArrowRightIcon,
  SparklesIcon,
  CameraIcon,
  UserGroupIcon
} from '@heroicons/vue/24/outline';

const router = useRouter();
const spotStore = useSpotStore();
const showCreateModal = ref(false);
const showShareModal = ref(false);
const showAddCameraModal = ref(false);
const showDeleteConfirmModal = ref(false);
const spotToDelete = ref<string | null>(null);
const selectedFeedUrl = ref('');
const selectedSpotName = ref('');
const selectedSpotId = ref<string | null>(null);
const isSubmitting = ref(false);
const addCameraError = ref<string | null>(null);

// Fixed metrics for demonstration
const getSpotMetrics = (spotId: string) => ({
  cameras: spotStore.spots.find(s => s.id === spotId)?.videoFeeds?.length ?? 0,
  people: Math.floor(Math.random() * 20),
  events: Math.floor(Math.random() * 10)
});

const newSpot = ref({
  name: '',
  category: 'retail',
  analysisPrompt: ''
});

const newCamera = ref({
  name: '',
  type: 'mobile' as const,
  url: ''
});

// Ensure videoFeeds is always an array
const getVideoFeeds = (spot: any) => {
  return Array.isArray(spot.videoFeeds) ? spot.videoFeeds : [];
};

// Fetch spots when component mounts
onMounted(() => {
  spotStore.fetchUserSpots();
});

const generateAIPrompt = async () => {
  const prompts = {
    retail: 'Monitor customer flow, detect queue formation, track inventory movement, identify security concerns',
    warehouse: 'Track worker safety, monitor equipment usage, detect unauthorized access, analyze workflow patterns',
    office: 'Monitor space utilization, track occupancy, ensure safety compliance, detect after-hours activity',
    restaurant: 'Track table occupancy, monitor kitchen safety, analyze customer service patterns, detect cleaning needs'
  };
  
  newSpot.value.analysisPrompt = prompts[newSpot.value.category as keyof typeof prompts] || '';
};

const createSpot = async () => {
  if (!newSpot.value.name || !newSpot.value.analysisPrompt) return;
  
  const spotId = await spotStore.createSpot(
    newSpot.value.name,
    {
      detectObjects: true,
      detectEvents: true,
      customRules: [],
      objectsToTrack: [],
      eventsToMonitor: []
    },
    {
      enabled: true,
      customInstructions: newSpot.value.analysisPrompt,
      reportFrequency: 'hourly',
      lastReport: null,
      alertThreshold: 80
    }
  );
  
  if (spotId) {
    showCreateModal.value = false;
    newSpot.value = {
      name: '',
      category: 'retail',
      analysisPrompt: ''
    };
  }
};

const openAddCameraModal = (spotId: string) => {
  selectedSpotId.value = spotId;
  newCamera.value = {
    name: '',
    type: 'mobile',
    url: ''
  };
  addCameraError.value = null;
  showAddCameraModal.value = true;
};

const addCamera = async () => {
  if (!selectedSpotId.value || !newCamera.value.name || isSubmitting.value) return;

  try {
    isSubmitting.value = true;
    addCameraError.value = null;
    
    // Validate inputs
    if (newCamera.value.type !== 'mobile' && newCamera.value.type !== 'demo' && !newCamera.value.url) {
      addCameraError.value = 'Stream URL is required for IP cameras and DVR/NVR systems';
      return;
    }
    
    // Handle demo camera type
    if (newCamera.value.type === 'demo') {
      const result = await spotStore.addVideoFeed(selectedSpotId.value, {
        name: newCamera.value.name,
        type: 'demo',
        url: '',
        demoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
      });

      if (result) {
        showAddCameraModal.value = false;
        newCamera.value = {
          name: '',
          type: 'mobile',
          url: ''
        };
      }
      return;
    }

    const result = await spotStore.addVideoFeed(selectedSpotId.value, {
      name: newCamera.value.name,
      type: newCamera.value.type,
      url: newCamera.value.url
    });

    if (result) {
      showAddCameraModal.value = false;
      newCamera.value = {
        name: '',
        type: 'mobile',
        url: ''
      };
    }
  } catch (error: any) {
    console.error('Error adding camera:', error);
    addCameraError.value = error.message || 'Failed to add camera. Please try again.';
  } finally {
    isSubmitting.value = false;
  }
};

const viewSpotDetails = (spotId: string) => {
  router.push(`/spots/${spotId}`);
};

const shareFeed = (spotId: string, feedId: string, spotName: string) => {
  const url = spotStore.generateFeedUrl(spotId, feedId);
  if (url) {
    selectedFeedUrl.value = url;
    selectedSpotName.value = spotName;
    showShareModal.value = true;
  }
};

const handleDeleteSpot = (spotId: string) => {
  spotToDelete.value = spotId;
  showDeleteConfirmModal.value = true;
};

const confirmDeleteSpot = async () => {
  if (spotToDelete.value) {
    try {
      await spotStore.deleteSpot(spotToDelete.value);
    } catch (error) {
      console.error('Error deleting spot:', error);
    }
  }
  showDeleteConfirmModal.value = false;
  spotToDelete.value = null;
};
</script>

<template>
  <div class="min-h-screen bg-black">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Network Status Banner -->
      <div 
        v-if="!spotStore.isOnline"
        class="mb-6 bg-yellow-900/50 border border-yellow-500/50 rounded-lg p-4 backdrop-blur-sm sticky top-0 z-50"
      >
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <svg class="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
            </svg>
          </div>
          <div class="ml-3">
            <h3 class="text-sm font-medium text-yellow-400">Offline Mode</h3>
            <div class="mt-1 text-sm text-yellow-400/80">
              You're currently offline. Some features may be limited. Changes will sync when you're back online.
              <button 
                @click="spotStore.setOnlineStatus(true)" 
                class="ml-2 underline hover:text-yellow-300"
              >
                Try reconnecting
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Header -->
      <div class="flex justify-between items-center mb-12">
        <div>
          <h1 class="text-3xl font-bold text-white">Monitoring Spots</h1>
          <p class="mt-2 text-gray-400">Manage and monitor your surveillance locations</p>
        </div>
        <button
          @click="showCreateModal = true"
          class="btn btn-primary"
        >
          <PlusIcon class="h-5 w-5 mr-2" />
          New Spot
        </button>
      </div>

      <!-- Loading State -->
      <div v-if="spotStore.loading" class="flex items-center justify-center min-h-[400px]">
        <div class="text-center">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-neon-green mx-auto"></div>
          <p class="mt-4 text-gray-400">Loading spots...</p>
        </div>
      </div>

      <!-- Empty State -->
      <div 
        v-else-if="!spotStore.spots.length" 
        class="bg-gray-900/50 backdrop-blur-sm rounded-2xl border border-neon-green/20 p-12 text-center"
      >
        <VideoCameraIcon class="h-12 w-12 text-gray-600 mx-auto mb-4" />
        <h3 class="text-lg font-medium text-white mb-2">No monitoring spots yet</h3>
        <p class="text-gray-400 mb-6">Start by creating your first monitoring spot</p>
        <button
          @click="showCreateModal = true"
          class="btn btn-primary"
        >
          <PlusIcon class="h-5 w-5 mr-2" />
          Create First Spot
        </button>
      </div>

      <!-- Spots Grid -->
      <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <div
          v-for="spot in spotStore.spots"
          :key="spot.id"
          class="bg-gray-900 rounded-xl border border-neon-green/20 overflow-hidden hover:border-neon-green/40 hover:shadow-lg hover:shadow-neon-green/10 transition-all duration-300"
        >
          <!-- Preview Image -->
          <div class="aspect-video bg-gray-800 relative">
            <!-- Camera Grid -->
            <div class="absolute inset-0 grid grid-cols-2 gap-1 p-2">
              <div
                v-for="feed in (spot.videoFeeds || []).slice(0, 4)"
                :key="feed.id"
                class="group bg-gray-900/50 backdrop-blur-sm rounded relative overflow-hidden cursor-pointer"
                @click="router.push(`/spots/${spot.id}/camera/${feed.id}`)"
              >
                <!-- Status Indicator -->
                <div class="absolute top-1 left-1 z-10">
                  <div :class="[
                    'h-2 w-2 rounded-full',
                    feed.status === 'active' ? 'bg-neon-green animate-pulse' : 'bg-gray-600'
                  ]"></div>
                </div>

                <!-- Camera Icon -->
                <div class="absolute inset-0 flex items-center justify-center">
                  <div class="transform group-hover:scale-110 transition-all duration-300">
                    <div class="h-8 w-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center">
                      <VideoCameraIcon class="h-4 w-4 text-neon-green" />
                    </div>
                  </div>
                </div>

                <!-- Hover Overlay -->
                <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </div>
            </div>
            
            <!-- Add Camera Button -->
            <button
              @click.stop="openAddCameraModal(spot.id)"
              class="absolute top-2 right-2 p-2 bg-black/60 backdrop-blur-sm rounded-lg text-white hover:bg-neon-green/20 hover:text-neon-green transition-all duration-300"
            >
              <CameraIcon class="h-5 w-5" />
            </button>
          </div>

          <!-- Spot Info -->
          <div class="p-6 bg-gradient-to-b from-gray-900 to-black">
            <h3 class="text-lg font-semibold text-white mb-2">{{ spot.name }}</h3>
            <p v-if="spot.assistant?.customInstructions" class="text-sm text-gray-400 line-clamp-2 mb-4">
              {{ spot.assistant.customInstructions }}
            </p>

            <!-- Fixed Metrics -->
            <div class="grid grid-cols-3 gap-4 mb-4 bg-black/50 backdrop-blur-sm rounded-lg p-3">
              <div class="text-center">
                <VideoCameraIcon class="h-5 w-5 text-neon-green mx-auto mb-1" />
                <p class="text-xs text-gray-400">Cameras</p>
                <p class="text-lg font-semibold text-white">{{ getSpotMetrics(spot.id).cameras }}</p>
              </div>
              <div class="text-center">
                <UserGroupIcon class="h-5 w-5 text-blue-400 mx-auto mb-1" />
                <p class="text-xs text-gray-400">People</p>
                <p class="text-lg font-semibold text-white">{{ getSpotMetrics(spot.id).people }}</p>
              </div>
              <div class="text-center">
                <ChartBarIcon class="h-5 w-5 text-purple-400 mx-auto mb-1" />
                <p class="text-xs text-gray-400">Events</p>
                <p class="text-lg font-semibold text-white">{{ getSpotMetrics(spot.id).events }}</p>
              </div>
            </div>
            
            <div class="flex space-x-3">
              <button
                @click="viewSpotDetails(spot.id)"
                class="flex-1 btn btn-outline text-sm hover:bg-neon-green/10"
              >
                View Details
                <ArrowRightIcon class="h-4 w-4 ml-2" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Create Spot Modal -->
      <div v-if="showCreateModal" class="modal-backdrop">
        <div class="card max-w-lg w-full">
          <div class="flex items-center justify-between p-6 border-b border-neon-green/20">
            <h3 class="text-xl font-semibold text-white">Create New Spot</h3>
            <button 
              @click="showCreateModal = false"
              class="text-gray-400 hover:text-white transition-colors"
            >
              <XMarkIcon class="h-6 w-6" />
            </button>
          </div>
          
          <form @submit.prevent="createSpot" class="p-6 space-y-6">
            <div>
              <label class="block text-sm font-medium text-gray-200 mb-2">Spot Name</label>
              <input
                v-model="newSpot.name"
                type="text"
                class="block w-full rounded-lg"
                placeholder="e.g., Main Store Floor"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-200 mb-2">Category</label>
              <select
                v-model="newSpot.category"
                @change="generateAIPrompt"
                class="block w-full rounded-lg"
              >
                <option value="retail">Retail Space</option>
                <option value="warehouse">Warehouse</option>
                <option value="office">Office</option>
                <option value="restaurant">Restaurant</option>
              </select>
            </div>

            <div>
              <div class="flex items-center justify-between mb-2">
                <label class="text-sm font-medium text-gray-200">What to Analyze</label>
                <button
                  type="button"
                  @click="generateAIPrompt"
                  class="inline-flex items-center text-sm text-neon-green hover:text-neon-green/80 transition-colors"
                >
                  <SparklesIcon class="h-4 w-4 mr-1" />
                  Generate with AI
                </button>
              </div>
              <textarea
                v-model="newSpot.analysisPrompt"
                rows="4"
                class="block w-full rounded-lg"
                placeholder="Describe what you want to monitor and analyze in this space..."
              ></textarea>
            </div>

            <div class="flex justify-end space-x-3">
              <button
                type="button"
                @click="showCreateModal = false"
                class="btn btn-outline"
              >
                Cancel
              </button>
              <button
                type="submit"
                class="btn btn-primary"
              >
                Create Spot
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Add Camera Modal -->
      <div v-if="showAddCameraModal" class="modal-backdrop">
        <div class="card max-w-lg w-full">
          <div class="flex items-center justify-between p-6 border-b border-neon-green/20">
            <h3 class="text-xl font-semibold text-white">Add Camera</h3>
            <button 
              @click="showAddCameraModal = false"
              class="text-gray-400 hover:text-white transition-colors"
            >
              <XMarkIcon class="h-6 w-6" />
            </button>
          </div>
          
          <form @submit.prevent="addCamera" class="p-6 space-y-6">
            <!-- Error Message -->
            <div v-if="addCameraError" class="bg-red-900/50 border border-red-500/50 rounded-lg p-4">
              <p class="text-sm text-red-400">{{ addCameraError }}</p>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-200 mb-2">Camera Name</label>
              <input
                v-model="newCamera.name"
                type="text"
                class="block w-full rounded-lg"
                placeholder="e.g., Front Door Camera"
                required
                :disabled="isSubmitting"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-200 mb-2">Camera Type</label>
              <select
                v-model="newCamera.type"
                class="block w-full rounded-lg"
                required
                :disabled="isSubmitting"
              >
                <option value="mobile">Mobile Device</option>
                <option value="ip-camera">IP Camera</option>
                <option value="dvr">DVR/NVR</option>
                <option value="demo">Demo Camera (YouTube)</option>
              </select>
            </div>

            <div v-if="newCamera.type !== 'mobile' && newCamera.type !== 'demo'">
              <label class="block text-sm font-medium text-gray-200 mb-2">Stream URL</label>
              <input
                v-model="newCamera.url"
                type="text"
                class="block w-full rounded-lg"
                placeholder="rtsp:// or http:// stream URL"
                :disabled="isSubmitting"
              />
              <p class="mt-2 text-sm text-gray-400">
                For IP cameras, enter the RTSP or HTTP stream URL. For DVR/NVR systems, enter the channel URL.
              </p>
            </div>

            <div class="flex justify-end space-x-3">
              <button
                type="button"
                @click="showAddCameraModal = false"
                class="btn btn-outline"
                :disabled="isSubmitting"
              >
                Cancel
              </button>
              <button
                type="submit"
                class="btn btn-primary relative"
                :disabled="isSubmitting || !newCamera.name || (newCamera.type !== 'mobile' && newCamera.type !== 'demo' && !newCamera.url)"
              >
                <span :class="{ 'opacity-0': isSubmitting }">
                  Add Camera
                </span>
                <div 
                  v-if="isSubmitting" 
                  class="absolute inset-0 flex items-center justify-center"
                >
                  <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-black"></div>
                </div>
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Share Feed Modal -->
      <ShareFeedModal
        :show="showShareModal"
        :url="selectedFeedUrl"
        :spot-name="selectedSpotName"
        @close="showShareModal = false"
      />
      
      <!-- Delete Confirmation Modal -->
      <DeleteConfirmationModal
        :show="showDeleteConfirmModal"
        title="Delete Spot"
        message="Are you sure you want to delete this spot? This action cannot be undone and all associated cameras and data will be permanently removed."
        @close="showDeleteConfirmModal = false"
        @confirm="confirmDeleteSpot"
      />
    </div>
  </div>
</template>