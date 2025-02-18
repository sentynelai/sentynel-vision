import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence, initializeFirestore, CACHE_SIZE_UNLIMITED } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAnalytics, isSupported } from 'firebase/analytics';

// Log environment variables availability (without exposing values)
const envVars = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
  'VITE_FIREBASE_MEASUREMENT_ID'
];

envVars.forEach(varName => {
  if (!import.meta.env[varName]) {
    console.error(`Missing environment variable: ${varName}`);
  }
});

// Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase with error handling
let app;
let auth;
let db;
let storage;
let analytics = null;

try {
  console.log('Initializing Firebase...');
  app = initializeApp(firebaseConfig);
  
  // Initialize Auth with persistence
  auth = getAuth(app);
  setPersistence(auth, browserLocalPersistence).catch(error => {
    console.error('Auth persistence error:', error);
  });

  // Initialize Firestore with offline persistence
  console.log('Initializing Firestore...');
  db = initializeFirestore(app, {
    experimentalForceLongPolling: true,
    localCache: {
      lru: {
        cacheSizeBytes: CACHE_SIZE_UNLIMITED
      },
      tabManager: {
        persistenceKey: 'sentynel-vision-db'
      }
    }
  });

  // Initialize Storage
  storage = getStorage(app);

  // Initialize Analytics if supported
  const initAnalytics = async () => {
    try {
      const analyticsSupported = await isSupported();
      if (analyticsSupported) {
        analytics = getAnalytics(app);
      }
    } catch (error) {
      console.warn('Analytics not supported:', error);
    }
  };

  // Enable Firestore offline persistence
  const initFirestore = async () => {
    try {
      await enableIndexedDbPersistence(db, {
        forceOwnership: false // Don't force ownership of persistence
      });
      console.log('Firestore persistence enabled');
    } catch (error: any) {
      if (error.code === 'already-exists') {
        // This is expected, persistence is already enabled
        console.info('Persistence already enabled');
      } else if (error.code === 'failed-precondition') {
        // This is expected in multi-tab scenarios, not an error
        console.info('Multiple tabs open, persistence enabled in another tab');
      } else if (error.code === 'unimplemented') {
        console.warn('Browser does not support persistence');
      } else {
        console.error('Firestore persistence error:', error);
      }
    }
  };

  // Initialize features sequentially to avoid race conditions
  const initializeFeatures = async () => {
    try {
      await initFirestore();
      await initAnalytics();
    } catch (error) {
      console.error('Failed to initialize Firebase features:', error);
    }
  };

  initializeFeatures();

} catch (error: any) {
  console.error('Firebase initialization error:', error.message);
  throw new Error(`Failed to initialize Firebase: ${error.message}`);
}

export { auth, db, storage, analytics };