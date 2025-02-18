import { nanoid } from 'nanoid';
import { db } from '../firebase/config';
import { collection, addDoc, query, where, orderBy, limit, getDocs, serverTimestamp } from 'firebase/firestore';

interface ProcessedChunk {
  id: string;
  url: string;
  timestamp: Date;
  status: 'pending' | 'processing' | 'ready' | 'error';
  error?: string;
}

export class VideoProcessingService {
  private static readonly CHUNK_LIMIT = 10;
  private static readonly SUPPORTED_FORMATS = ['video/webm', 'video/mp4'];
  private static readonly CHUNK_BUFFER_SIZE = 5;
  private static readonly VIDEO_BITRATE = 2500000; // 2.5 Mbps
  private static readonly SEGMENT_DURATION = 6; // 6 seconds per HLS segment
  private static readonly QUALITY_VARIANTS = [
    { height: 720, bitrate: '2.5M' },
    { height: 480, bitrate: '1M' },
    { height: 360, bitrate: '600k' }
  ];

  private cameraId: string;
  private processedChunks: Map<string, ProcessedChunk>;
  private downloadQueue: string[];
  private isProcessing: boolean;
  private blobUrls: Set<string>;

  constructor(cameraId: string) {
    this.cameraId = cameraId;
    this.processedChunks = new Map();
    this.downloadQueue = [];
    this.isProcessing = false;
    this.blobUrls = new Set();
  }

  async initialize(): Promise<void> {
    try {
      this.cleanup();
      console.log('Video processing service initialized');
    } catch (error) {
      console.error('Failed to initialize video processing:', error);
      throw error;
    }
  }

  async processVideoChunks(spotId: string, feedId: string): Promise<ProcessedChunk[]> {
    try {
      if (this.isProcessing) {
        console.log('Already processing chunks, returning current state');
        return Array.from(this.processedChunks.values());
      }

      this.isProcessing = true;

      // Get recent chunks from Firestore
      const chunksRef = collection(db, 'video_chunks');
      const timeAgo = new Date(Date.now() - 5 * 60 * 1000); // Last 5 minutes
      
      const q = query(
        chunksRef,
        where('spotId', '==', spotId),
        where('feedId', '==', feedId),
        where('timestamp', '>=', timeAgo),
        orderBy('timestamp', 'desc'),
        limit(this.CHUNK_BUFFER_SIZE)
      );

      const snapshot = await getDocs(q);
      const chunks = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        timestamp: doc.data().timestamp?.toDate() || new Date()
      }));

      // Sort chunks by timestamp
      const sortedChunks = chunks.sort(
        (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
      );

      // Take only the most recent chunks up to the limit
      const recentChunks = sortedChunks.slice(-VideoProcessingService.CHUNK_LIMIT);

      // Process each chunk
      for (const chunk of recentChunks) {
        if (!this.processedChunks.has(chunk.id)) {
          const processedChunk: ProcessedChunk = {
            id: chunk.id,
            url: chunk.url,
            timestamp: chunk.timestamp,
            status: 'pending'
          };

          this.processedChunks.set(chunk.id, processedChunk);
          this.downloadQueue.push(chunk.id);
        }
      }

      // Start processing queue
      await this.processQueue();

      return Array.from(this.processedChunks.values())
        .filter(chunk => chunk.status === 'ready')
        .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    } catch (error) {
      console.error('Error processing video chunks:', error);
      throw error;
    } finally {
      this.isProcessing = false;
    }
  }

  private async processQueue(): Promise<void> {
    while (this.downloadQueue.length > 0) {
      const chunkId = this.downloadQueue.shift();
      if (!chunkId) continue;

      const chunk = this.processedChunks.get(chunkId);
      if (!chunk) continue;

      try {
        // Download chunk
        chunk.status = 'processing';
        const response = await fetch(chunk.url);
        if (!response.ok) throw new Error('Failed to download chunk');

        // Get the blob
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        this.blobUrls.add(blobUrl);

        // Update chunk with processed URL
        chunk.url = blobUrl;
        chunk.status = 'ready';
        this.processedChunks.set(chunkId, chunk);

      } catch (error) {
        console.error(`Failed to process chunk ${chunkId}:`, error);
        chunk.status = 'error';
        chunk.error = error instanceof Error ? error.message : 'Unknown error';
        this.processedChunks.set(chunkId, chunk);
      }
    }
  }

  cleanup(): void {
    // Revoke all blob URLs
    for (const url of this.blobUrls) {
      URL.revokeObjectURL(url);
    }
    this.blobUrls.clear();

    // Clear all processed chunks
    this.processedChunks.clear();
    this.downloadQueue = [];
    this.isProcessing = false;
  }
}