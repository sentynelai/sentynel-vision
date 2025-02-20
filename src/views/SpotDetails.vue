<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useSpotStore } from '../stores/spots';
import ShareFeedModal from '../components/ShareFeedModal.vue';
import EditSpotModal from '../components/EditSpotModal.vue';
import EditCameraModal from '../components/EditCameraModal.vue';
import AddCameraWizard from '../components/AddCameraWizard.vue';
import CameraStatusIndicator from '../components/CameraStatusIndicator.vue';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal.vue';
import { 
  VideoCameraIcon,
  PlusIcon,
  ChartBarIcon,
  BellAlertIcon,
  ClockIcon,
  XMarkIcon,
  ArrowLeftIcon,
  UserGroupIcon,
  ShareIcon,
  PencilIcon,
  EyeIcon
} from '@heroicons/vue/24/outline';

const route = useRoute();
const router = useRouter();
const spotStore = useSpotStore();

const loading = ref(true);
const error = ref<string | null>(null);
const showShareModal = ref(false);
const showEditSpotModal = ref(false);
const showEditCameraModal = ref(false);
const showAddCameraModal = ref(false);
const showDeleteConfirmModal = ref(false);
const selectedFeed = ref<any | null>(null);
const selectedFeedUrl = ref('');
const activeTab = ref('overview');

// Get spot ID from route params
const spotId = computed(() => route.params.id as string);

// Get spot data from store
const spot = computed(() => spotStore.spots.find(s => s.id === spotId.value));

// Mock analytics data (replace with real data)
const analytics = ref({
  totalVisitors: 245,
  activeFeeds: 3,
  alerts: 2,
  uptime: '98.5%',
  recentEvents: [
    { id: 1, type: 'Person Detected', time: '2 mins ago', severity: 'low' },
    { id: 2, type: 'Motion Alert', time: '5 mins ago', severity: 'medium' },
    { id: 3, type: 'Object Left Behind', time: '15 mins ago', severity: 'high' }
  ]
});

// Initialize data
onMounted(async () => {
  try {
    loading.value = true;
    error.value = null;
    await spotStore.fetchUserSpots();
    
    if (!spot.value) {
      error.value = 'Spot not found';
    }
  } catch (err: any) {
    console.error('Error loading spot:', err);
    error.value = err.message || 'Failed to load spot details';
  } finally {
    loading.value = false;
  }
});

const handleShareFeed = (feed: any) => {
  const url = spotStore.generateFeedUrl(spotId.value, feed.id);
  if (url) {
    selectedFeedUrl.value = url;
    showShareModal.value = true;
  }
};

const handleEditFeed = (feed: any) => {
  selectedFeed.value = feed;
  showEditCameraModal.value = true;
};

const handleDeleteFeed = async () => {
  try {
    if (!selectedFeed.value || !spot.value) return;
    
    await spotStore.deleteVideoFeed(spot.value.id, selectedFeed.value.id);
    showEditCameraModal.value = false;
  } catch (err: any) {
    console.error('Error deleting camera:', err);
    error.value = err.message || 'Failed to delete camera';
  }
};

const handleUpdateFeed = async (updates: any) => {
  try {
    if (!selectedFeed.value || !spot.value) return;
    
    const success = await spotStore.updateVideoFeed(
      spot.value.id,
      selectedFeed.value.id,
      updates
    );
    
    if (success) {
      showEditCameraModal.value = false;
    }
  } catch (err: any) {
    console.error('Error updating camera:', err);
  }
};

const handleEditSpot = () => {
  showEditSpotModal.value = true;
};

const handleAddCamera = () => {
  showAddCameraModal.value = true;
};

const handleDeleteSpot = async () => {
  showDeleteConfirmModal.value = true;
};

const confirmDeleteSpot = async () => {
  try {
    if (!spotId.value) {
      throw new Error('Invalid spot ID');
    }

    await spotStore.deleteSpot(spotId.value);
    router.push('/spots');
  } catch (err: any) {
    console.error('Error deleting spot:', err);
    showDeleteConfirmModal.value = false;
    setTimeout(() => {
      error.value = err.message || 'Failed to delete spot';
    }, 300);
  }
};

const handleAddCameraSuccess = async (camera: any) => {
  try {
    const result = await spotStore.addVideoFeed(spot.value!.id, camera);
    if (result) {
      showAddCameraModal.value = false;
      selectedFeedUrl.value = result.shareUrl || '';
      showShareModal.value = true;
    }
  } catch (error) {
    console.error('Failed to add camera:', error);
  }
};

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case 'high': return 'text-red-500';
    case 'medium': return 'text-yellow-500';
    case 'low': return 'text-blue-500';
    default: return 'text-gray-500';
  }
};
// Rest of the script content...
</script>

<template>
  <div class="min-h-screen bg-black">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Floating Action Button -->
      <div class="fixed bottom-8 right-8 z-50">
        <button
          @click="handleAddCamera"
          class="btn btn-primary shadow-lg hover:shadow-neon-green/20 transition-all duration-200 p-4"
          title="Add Camera"
        >
          <PlusIcon class="h-6 w-6 mr-2" />
          Add Camera
        </button>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="flex items-center justify-center min-h-[400px]">
        <div class="text-center">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-neon-green mx-auto"></div>
          <p class="mt-4 text-gray-400">Loading spot details...</p>
        </div>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="flex items-center justify-center min-h-[400px]">
        <div class="text-center">
          <XMarkIcon class="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 class="text-lg font-medium text-white mb-2">Error</h3>
          <p class="text-red-400">{{ error }}</p>
          <button
            @click="router.push('/spots')"
            class="mt-4 btn btn-outline"
          >
            Back to Spots
          </button>
        </div>
      </div>

      <!-- Content -->
      <template v-else-if="spot">
        <!-- Header -->
        <div class="flex justify-between items-center mb-8">
          <div>
            <h1 class="text-3xl font-bold text-white">{{ spot.name }}</h1>
            <p class="mt-2 text-gray-400">{{ spot.assistant?.customInstructions }}</p>
          </div>
          <div class="flex space-x-3">
            <button
              @click="handleEditSpot"
              class="btn btn-outline"
            >
              Edit Spot
            </button>
            <button
              @click="handleDeleteSpot"
              class="btn bg-red-500 hover:bg-red-600 text-white"
            >
              Delete Spot
            </button>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <!-- Camera Cards -->
          <div
            v-for="feed in (spot.videoFeeds || [])"
            :key="feed.id"
            class="bg-gray-900 rounded-xl border border-neon-green/20 overflow-hidden flex flex-col"
          >
            <!-- Camera Preview -->
            <div class="aspect-video bg-gray-800 relative">
              <!-- Placeholder Camera Feed Image -->
              <img
                src="https://images.unsplash.com/photo-1557683304-673a23048d34?w=800&h=450&fit=crop&q=80"
                class="absolute inset-0 w-full h-full object-cover"
                alt="Camera feed"
              />
              
              <!-- Dark Overlay -->
              <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-black/30"></div>

              <!-- Status Badge -->
              <div class="absolute top-2 left-2">
                <CameraStatusIndicator
                  :status="feed.status"
                  :type="feed.type"
                />
              </div>

              <!-- Quick Stats -->
              <div class="absolute bottom-0 left-0 right-0 p-4">
                <div class="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <VideoCameraIcon class="h-4 w-4 text-neon-green mx-auto mb-1" />
                    <p class="text-xs text-gray-400">Events</p>
                    <p class="text-sm font-semibold text-white">12</p>
                  </div>
                  <div>
                    <UserGroupIcon class="h-4 w-4 text-blue-400 mx-auto mb-1" />
                    <p class="text-xs text-gray-400">People</p>
                    <p class="text-sm font-semibold text-white">5</p>
                  </div>
                  <div>
                    <BellAlertIcon class="h-4 w-4 text-red-400 mx-auto mb-1" />
                    <p class="text-xs text-gray-400">Alerts</p>
                    <p class="text-sm font-semibold text-white">2</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Camera Info -->
            <div class="p-4 bg-gradient-to-b from-gray-900 to-black space-y-4 flex-1">
              <!-- Camera Name and Type -->
              <div>
                <h3 class="text-lg font-semibold text-white">{{ feed.name }}</h3>
                <p class="text-sm text-gray-400">{{ feed.type === 'mobile' ? 'Mobile Device' : feed.type === 'ip-camera' ? 'IP Camera' : 'DVR/NVR' }}</p>
              </div>
              
              <!-- Action Buttons -->
              <div class="grid grid-cols-3 gap-3">
                <button 
                  @click="router.push(`/spots/${spot.id}/camera/${feed.id}`)"
                  class="flex items-center justify-center px-4 py-2 bg-neon-green hover:bg-neon-green/90 text-black rounded-lg transition-colors"
                  :disabled="!feed.muxPlaybackId"
                >
                  <VideoCameraIcon class="h-4 w-4 mr-2" />
                  <span class="text-sm">{{ feed.muxPlaybackId ? 'View Video' : 'No Stream' }}</span>
                </button>
                <button 
                  @click="handleShareFeed(feed)"
                  class="flex items-center justify-center px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
                >
                  <ShareIcon class="h-4 w-4 mr-2 text-neon-green" />
                  <span class="text-sm">Share URL</span>
                </button>
                <button 
                  @click="handleEditFeed(feed)"
                  class="flex items-center justify-center px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
                >
                  <PencilIcon class="h-4 w-4 mr-2 text-neon-green" />
                  <span class="text-sm">Edit</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Modals -->
        <ShareFeedModal
          v-if="showShareModal"
          :show="showShareModal"
          :url="selectedFeedUrl"
          :spot-name="spot.name"
          @close="showShareModal = false"
        />

        <EditSpotModal
          v-if="showEditSpotModal"
          :show="showEditSpotModal"
          :spot="spot"
          @close="showEditSpotModal = false"
          @save="() => {}"
          @delete="handleDeleteSpot"
        />

        <EditCameraModal
          v-if="showEditCameraModal && selectedFeed"
          :show="showEditCameraModal"
          :camera="selectedFeed"
          @close="showEditCameraModal = false"
          @save="handleUpdateFeed"
          @delete="handleDeleteFeed"
        />

        <AddCameraWizard
          v-if="showAddCameraModal"
          :show="showAddCameraModal"
          :spot-name="spot.name"
          @close="showAddCameraModal = false"
          @save="handleAddCameraSuccess"
        />

        <DeleteConfirmationModal
          :show="showDeleteConfirmModal"
          title="Delete Spot"
          message="Are you sure you want to delete this spot? This action cannot be undone and all associated cameras and data will be permanently removed."
          @close="showDeleteConfirmModal = false"
          @confirm="confirmDeleteSpot"
        />
      </template>
    </div>
  </div>
</template>