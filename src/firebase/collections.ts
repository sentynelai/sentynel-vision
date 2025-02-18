import { collection } from 'firebase/firestore';
import { db } from './config';

// Define collection references
export const spotsCollection = collection(db, 'spots');
export const videoChunksCollection = collection(db, 'video_chunks');
export const analysisResultsCollection = collection(db, 'analysis_results');
export const reportsCollection = collection(db, 'reports');