import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  doc
} from 'firebase/firestore';
import { db } from '../firebase/config';
import type { VideoChunk, AnalysisResult, Report } from '../firebase/schema';

export class DatabaseService {
  // Video Chunks
  static async saveVideoChunk(chunk: Omit<VideoChunk, 'id'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, 'video_chunks'), {
        ...chunk,
        timestamp: serverTimestamp()
      });
      return docRef.id;
    } catch (error) {
      console.error('Error saving video chunk:', error);
      throw error;
    }
  }

  static async getRecentChunks(
    spotId: string,
    feedId: string,
    minutes: number = 5
  ): Promise<VideoChunk[]> {
    try {
      const timeAgo = new Date(Date.now() - minutes * 60 * 1000);
      
      const q = query(
        collection(db, 'video_chunks'),
        where('spotId', '==', spotId),
        where('feedId', '==', feedId),
        where('timestamp', '>=', timeAgo),
        where('status', '==', 'ready'),
        orderBy('timestamp', 'desc'),
        limit(10)
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as VideoChunk[];
    } catch (error) {
      console.error('Error getting video chunks:', error);
      throw error;
    }
  }

  static async updateChunkStatus(
    chunkId: string,
    status: VideoChunk['status'],
    error?: string
  ): Promise<void> {
    try {
      const chunkRef = doc(db, 'video_chunks', chunkId);
      await updateDoc(chunkRef, {
        status,
        ...(error && { error }),
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating chunk status:', error);
      throw error;
    }
  }

  // Analysis Results
  static async saveAnalysisResult(result: Omit<AnalysisResult, 'id'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, 'analysis_results'), {
        ...result,
        timestamp: serverTimestamp()
      });
      return docRef.id;
    } catch (error) {
      console.error('Error saving analysis result:', error);
      throw error;
    }
  }

  static async getRecentAnalysis(
    spotId: string,
    feedId: string,
    limit: number = 10
  ): Promise<AnalysisResult[]> {
    try {
      const q = query(
        collection(db, 'analysis_results'),
        where('spotId', '==', spotId),
        where('feedId', '==', feedId),
        orderBy('timestamp', 'desc'),
        limit
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AnalysisResult[];
    } catch (error) {
      console.error('Error getting analysis results:', error);
      throw error;
    }
  }

  // Reports
  static async saveReport(report: Omit<Report, 'id'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, 'reports'), {
        ...report,
        generatedAt: serverTimestamp()
      });
      return docRef.id;
    } catch (error) {
      console.error('Error saving report:', error);
      throw error;
    }
  }

  static async getReports(
    spotId: string,
    feedId?: string,
    limit: number = 10
  ): Promise<Report[]> {
    try {
      let q = query(
        collection(db, 'reports'),
        where('spotId', '==', spotId),
        orderBy('generatedAt', 'desc'),
        limit
      );

      if (feedId) {
        q = query(q, where('feedId', '==', feedId));
      }

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Report[];
    } catch (error) {
      console.error('Error getting reports:', error);
      throw error;
    }
  }

  // Cleanup
  static async deleteOldChunks(days: number = 7): Promise<void> {
    try {
      const timeAgo = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      
      const q = query(
        collection(db, 'video_chunks'),
        where('timestamp', '<=', timeAgo)
      );

      const snapshot = await getDocs(q);
      const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
    } catch (error) {
      console.error('Error deleting old chunks:', error);
      throw error;
    }
  }
}