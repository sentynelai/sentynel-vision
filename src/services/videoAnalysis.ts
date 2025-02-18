import { ref } from 'vue';
import { storage, db } from '../firebase/config';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { AIService, type AnalysisResult } from './ai';
import type { VideoFeed, Spot } from '../stores/spots';

interface AnalysisStats {
  objectsDetected: number;
  peopleCount: number;
  lastEvent: string | null;
}

export class VideoAnalysisService {
  private static readonly CAPTURE_INTERVAL = 10000; // 10 seconds
  private static readonly ANALYSIS_BUFFER_SIZE = 5; // Number of frames to buffer before analysis
  private static activeAnalysis: Map<string, boolean> = new Map();
  private static analysisStats: Map<string, AnalysisStats> = new Map();

  static getStats(spotId: string, feedId: string): AnalysisStats {
    const key = `${spotId}-${feedId}`;
    return this.analysisStats.get(key) || {
      objectsDetected: 0,
      peopleCount: 0,
      lastEvent: null
    };
  }

  static async startAnalysis(
    spot: Spot,
    feed: VideoFeed,
    videoElement: HTMLVideoElement,
    onStatsUpdate?: (stats: AnalysisStats) => void
  ) {
    const key = `${spot.id}-${feed.id}`;
    if (this.activeAnalysis.get(key)) return;

    this.activeAnalysis.set(key, true);
    const frameBuffer: string[] = [];
    
    try {
      while (this.activeAnalysis.get(key)) {
        // Capture frame
        const frameData = await this.captureFrame(videoElement);
        frameBuffer.push(frameData);

        // Process buffer when full
        if (frameBuffer.length >= this.ANALYSIS_BUFFER_SIZE) {
          await this.processFrameBuffer(spot, feed, frameBuffer, onStatsUpdate);
          frameBuffer.length = 0; // Clear buffer
        }

        // Wait for next capture
        await new Promise(resolve => setTimeout(resolve, this.CAPTURE_INTERVAL));
      }
    } catch (error) {
      console.error('Analysis error:', error);
      this.stopAnalysis(spot.id, feed.id);
    }
  }

  static stopAnalysis(spotId: string, feedId: string) {
    const key = `${spotId}-${feedId}`;
    this.activeAnalysis.delete(key);
    this.analysisStats.delete(key);
  }

  private static async processFrameBuffer(
    spot: Spot,
    feed: VideoFeed,
    frameBuffer: string[],
    onStatsUpdate?: (stats: AnalysisStats) => void
  ) {
    const key = `${spot.id}-${feed.id}`;
    const analysisResults: AnalysisResult[] = [];

    for (const frameData of frameBuffer) {
      try {
        // Upload frame
        const frameRef = storageRef(storage, `frames/${spot.id}/${feed.id}/${Date.now()}.jpg`);
        const frameBlob = await (await fetch(frameData)).blob();
        await uploadBytes(frameRef, frameBlob);
        const frameUrl = await getDownloadURL(frameRef);

        // Analyze frame
        const result = await AIService.analyzeFrame(frameUrl);
        analysisResults.push(result);

        // Update stats
        const stats = {
          objectsDetected: result.objects.length,
          peopleCount: result.objects.filter(obj => obj.toLowerCase().includes('person')).length,
          lastEvent: result.labels[0] || null
        };
        this.analysisStats.set(key, stats);
        onStatsUpdate?.(stats);

        // Store analysis result
        await this.storeAnalysisResult(spot, feed, result);
      } catch (error) {
        console.error('Frame processing error:', error);
      }
    }

    // Generate report if needed
    if (spot.assistant.enabled && analysisResults.length > 0) {
      const report = await AIService.generateReport(spot, feed, analysisResults);
      await this.storeReport(spot.id, feed.id, report);
    }
  }

  private static async captureFrame(videoElement: HTMLVideoElement): Promise<string> {
    const canvas = document.createElement('canvas');
    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;
    
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not get canvas context');
    
    context.drawImage(videoElement, 0, 0);
    return canvas.toDataURL('image/jpeg', 0.8);
  }

  private static async storeAnalysisResult(
    spot: Spot,
    feed: VideoFeed,
    result: AnalysisResult
  ) {
    const analysisRef = await addDoc(collection(db, 'analysis_results'), {
      spotId: spot.id,
      feedId: feed.id,
      timestamp: serverTimestamp(),
      objects: result.objects,
      labels: result.labels,
      faces: result.faces,
      text: result.text,
      safeSearch: result.safeSearch
    });

    // Update feed status
    const spotRef = doc(db, 'spots', spot.id);
    await updateDoc(spotRef, {
      [`videoFeeds.${feed.id}.lastAnalysis`]: serverTimestamp(),
      [`videoFeeds.${feed.id}.status`]: 'active'
    });

    return analysisRef.id;
  }

  private static async storeReport(spotId: string, feedId: string, report: any) {
    await addDoc(collection(db, 'reports'), {
      spotId,
      feedId,
      ...report,
      createdAt: serverTimestamp()
    });
  }
}