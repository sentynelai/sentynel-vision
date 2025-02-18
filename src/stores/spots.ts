import { defineStore } from 'pinia';
import { ref } from 'vue';
import { db } from '../firebase/config';
import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  where
} from 'firebase/firestore';
import { useAuthStore } from './auth';
import { nanoid } from 'nanoid';

export interface VideoFeed {
  id: string;
  name: string;
  type: 'mobile' | 'ip-camera' | 'dvr' | 'demo';
  url: string;
  muxStreamId?: string;
  muxPlaybackId?: string;
  demoUrl?: string;
  status: 'active' | 'inactive';
  lastAnalysis: Date | null;
  connectionToken: string;
  shareUrl?: string;
}

export interface AISettings {
  detectObjects: boolean;
  detectEvents: boolean;
  customRules: string[];
  objectsToTrack: string[];
  eventsToMonitor: string[];
}

export interface AssistantSettings {
  enabled: boolean;
  customInstructions: string;
  reportFrequency: 'hourly' | 'daily' | 'weekly';
  lastReport: Date | null;
  alertThreshold: number;
}

export interface Spot {
  id: string;
  name: string;
  userId: string;
  videoFeeds?: VideoFeed[];
  aiSettings: AISettings;
  assistant: AssistantSettings;
  createdAt: Date;
  updatedAt: Date;
}

export const useSpotStore = defineStore('spots', () => {
  const spots = ref<Spot[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const isOnline = ref(true);

  const authStore = useAuthStore();

  const fetchUserSpots = async () => {
    if (!authStore.user) {
      spots.value = [];
      return;
    }

    try {
      loading.value = true;
      error.value = null;

      const spotsRef = collection(db, 'spots');
      const q = query(spotsRef, where('userId', '==', authStore.user.uid));
      const querySnapshot = await getDocs(q);

      spots.value = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Spot[];

    } catch (err: any) {
      console.error('Error fetching spots:', err);
      error.value = err.message || 'Failed to fetch spots';
    } finally {
      loading.value = false;
    }
  };

  const fetchSpotByConnectionToken = async (connectionToken: string) => {
    try {
      if (!connectionToken) {
        throw new Error('Invalid connection token');
      }

      loading.value = true;
      error.value = null;
      
      const spotsRef = collection(db, 'spots');
      const q = query(spotsRef);
      const querySnapshot = await getDocs(q);

      // Find spot with matching connection token in any video feed
      const spotDoc = querySnapshot.docs.find(doc => {
        const data = doc.data();
        return data.videoFeeds && Array.isArray(data.videoFeeds) && 
          data.videoFeeds.some((feed: any) => feed.connectionToken === connectionToken);
      });

      if (!spotDoc) {
        throw new Error('Invalid connection code');
      }

      // Convert Firestore timestamp to Date
      const spotData = {
        id: spotDoc.id,
        ...spotDoc.data(),
        createdAt: spotDoc.data().createdAt?.toDate() || new Date(),
        updatedAt: spotDoc.data().updatedAt?.toDate() || new Date()
      } as Spot;

      // Verify the feed exists
      const feed = spotData.videoFeeds?.find(feed => feed.connectionToken === connectionToken);
      if (!feed) {
        throw new Error('Invalid connection code');
      }

      spots.value = [spotData];
      return spotData;

    } catch (err: any) {
      console.error('Error fetching spot by connection token:', err);
      error.value = err.message || 'Failed to fetch spot';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const createSpot = async (
    name: string,
    aiSettings: AISettings,
    assistant: AssistantSettings
  ) => {
    if (!authStore.user) return null;

    try {
      loading.value = true;
      error.value = null;

      const newSpot: Omit<Spot, 'id'> = {
        name,
        userId: authStore.user.uid,
        videoFeeds: [] as VideoFeed[],
        aiSettings,
        assistant,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const docRef = await addDoc(collection(db, 'spots'), {
        ...newSpot,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      const spot: Spot = {
        id: docRef.id,
        ...newSpot
      };

      spots.value.push(spot);
      return docRef.id;

    } catch (err: any) {
      console.error('Error creating spot:', err);
      error.value = err.message || 'Failed to create spot';
      return null;
    } finally {
      loading.value = false;
    }
  };

  const addVideoFeed = async (
    spotId: string,
    feed: Omit<VideoFeed, 'id' | 'status' | 'lastAnalysis' | 'connectionToken' | 'shareUrl'>
  ) => {
    try {
      const spot = spots.value.find(s => s.id === spotId);
      if (!spot) throw new Error('Spot not found');

      if (!spot.videoFeeds) {
        spot.videoFeeds = [];
      }

      const newFeed: VideoFeed = {
        id: nanoid(),
        ...feed,
        status: 'inactive',
        lastAnalysis: null,
        connectionToken: nanoid(10)
      };

      const spotRef = doc(db, 'spots', spotId);
      await updateDoc(spotRef, {
        videoFeeds: [...spot.videoFeeds, newFeed],
        updatedAt: serverTimestamp()
      });

      spot.videoFeeds.push(newFeed);
      return {
        ...newFeed,
        shareUrl: `/c/${newFeed.connectionToken}`
      };

    } catch (err: any) {
      console.error('Error adding video feed:', err);
      error.value = err.message || 'Failed to add video feed';
      return null;
    }
  };

  const updateVideoFeed = async (
    spotId: string,
    feedId: string,
    updates: Partial<VideoFeed>
  ) => {
    try {
      const spot = spots.value.find(s => s.id === spotId);
      if (!spot) throw new Error('Spot not found');

      const feedIndex = spot.videoFeeds.findIndex(f => f.id === feedId);
      if (feedIndex === -1) throw new Error('Feed not found');

      const updatedFeed = {
        ...spot.videoFeeds[feedIndex],
        ...updates
      };

      const updatedFeeds = [...spot.videoFeeds];
      updatedFeeds[feedIndex] = updatedFeed;

      const spotRef = doc(db, 'spots', spotId);
      await updateDoc(spotRef, {
        videoFeeds: updatedFeeds,
        updatedAt: serverTimestamp()
      });

      spot.videoFeeds = updatedFeeds;
      return true;

    } catch (err: any) {
      console.error('Error updating video feed:', err);
      error.value = err.message || 'Failed to update video feed';
      return false;
    }
  };

  const deleteVideoFeed = async (spotId: string, feedId: string) => {
    try {
      const spot = spots.value.find(s => s.id === spotId);
      if (!spot) throw new Error('Spot not found');

      const updatedFeeds = spot.videoFeeds.filter(f => f.id !== feedId);

      const spotRef = doc(db, 'spots', spotId);
      await updateDoc(spotRef, {
        videoFeeds: updatedFeeds,
        updatedAt: serverTimestamp()
      });

      spot.videoFeeds = updatedFeeds;
      return true;

    } catch (err: any) {
      console.error('Error deleting video feed:', err);
      error.value = err.message || 'Failed to delete video feed';
      return false;
    }
  };

  const deleteSpot = async (spotId: string) => {
    try {
      if (!authStore.user) {
        throw new Error('You must be logged in to delete spots');
      }

      // Verify ownership before deleting
      const spot = spots.value.find(s => s.id === spotId);
      if (!spot) {
        throw new Error('Spot not found');
      }
      
      if (spot.userId !== authStore.user.uid) {
        throw new Error('You do not have permission to delete this spot');
      }

      await deleteDoc(doc(db, 'spots', spotId));
      spots.value = spots.value.filter(s => s.id !== spotId);
      return true;
    } catch (err: any) {
      console.error('Error deleting spot:', err);
      error.value = err.message || 'Failed to delete spot';
      return false;
    }
  };

  const generateFeedUrl = (spotId: string, feedId: string) => {
    const spot = spots.value.find(s => s.id === spotId);
    if (!spot) return null;

    const feed = spot.videoFeeds.find(f => f.id === feedId);
    if (!feed) return null;

    const baseUrl = window.location.origin;
    return `${baseUrl}/c/${feed.connectionToken}`;
  };

  const updateVideoFeedStatus = async (
    spotId: string,
    feedId: string,
    status: 'active' | 'inactive'
  ) => {
    return updateVideoFeed(spotId, feedId, { status });
  };

  const setOnlineStatus = (status: boolean) => {
    isOnline.value = status;
  };

  return {
    spots,
    loading,
    error,
    isOnline,
    fetchSpotByConnectionToken,
    fetchUserSpots,
    createSpot,
    addVideoFeed,
    updateVideoFeed,
    deleteVideoFeed,
    deleteSpot,
    generateFeedUrl,
    updateVideoFeedStatus,
    setOnlineStatus
  };
});

//export { useSpotStore }