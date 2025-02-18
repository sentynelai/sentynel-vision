<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useSpotStore } from '../stores/spots';

const spotStore = useSpotStore();

onMounted(() => {
  spotStore.fetchUserSpots();
});

// Placeholder for report data structure
const reports = ref([
  {
    id: 1,
    spotName: 'Example Spot',
    date: new Date().toLocaleDateString(),
    events: [
      { time: '09:00 AM', type: 'Object Detected', description: 'Person entered the frame' },
      { time: '10:30 AM', type: 'Event Detected', description: 'Unusual activity detected' }
    ]
  }
]);
</script>

<template>
  <div class="min-h-screen bg-gray-100">
    <main class="py-10">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 class="text-3xl font-bold text-gray-900">Reports</h1>
        
        <div class="mt-8">
          <div v-for="report in reports" :key="report.id" class="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
            <div class="px-4 py-5 sm:px-6">
              <h3 class="text-lg leading-6 font-medium text-gray-900">
                {{ report.spotName }}
              </h3>
              <p class="mt-1 max-w-2xl text-sm text-gray-500">
                Report Date: {{ report.date }}
              </p>
            </div>
            <div class="border-t border-gray-200">
              <dl>
                <div v-for="(event, index) in report.events" :key="index" 
                     class="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt class="text-sm font-medium text-gray-500">
                    {{ event.time }}
                  </dt>
                  <dd class="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    <div class="font-medium">{{ event.type }}</div>
                    <div class="text-gray-500">{{ event.description }}</div>
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>