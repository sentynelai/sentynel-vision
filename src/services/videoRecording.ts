import { nanoid } from 'nanoid';
import { db } from '../firebase/config';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export class VideoRecordingService {
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private recordingInterval: number = 300000; // 5 minute chunks
  private intervalId: number | null = null;
  private spotId: string;
  private feedId: string;
  private uploadTasks: Map<string, { 
    progress: number;
    checksum: string;
    resumeToken?: string;
  }> = new Map();

  constructor(spotId: string, feedId: string) {
    this.spotId = spotId;
    this.feedId = feedId;
  }

  async startRecording(stream: MediaStream) {
    try {
      // Find supported MIME type with optimal codecs
      const mimeTypes = [
        'video/webm;codecs=vp8,opus',
        'video/webm;codecs=h264,opus',
        'video/webm'
      ];

      let selectedMimeType = null;
      for (const mimeType of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mimeType)) {
          selectedMimeType = mimeType;
          break;
        }
      }

      if (!selectedMimeType) {
        throw new Error('No supported video recording format found');
      }

      // Create MediaRecorder with optimal settings
      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType: selectedMimeType,
        videoBitsPerSecond: 2500000 // 2.5 Mbps for better quality
      });

      // Handle recorded data
      this.mediaRecorder.ondataavailable = async (event) => {
        if (event.data.size > 0) {
          this.recordedChunks.push(event.data);
          await this.uploadChunk();
        }
      };

      // Start recording
      this.mediaRecorder.start();

      // Set up interval for chunks
      this.intervalId = window.setInterval(() => {
        if (this.mediaRecorder?.state === 'recording') {
          this.mediaRecorder.requestData();
        }
      }, this.recordingInterval);

      console.log('Recording started with format:', selectedMimeType);
      return true;

    } catch (error) {
      console.error('Failed to start recording:', error);
      throw error;
    }
  }

  private async uploadChunk() {
    if (this.recordedChunks.length === 0) return;

    try {
      const chunk = this.recordedChunks.shift();
      if (!chunk) return;

      const timestamp = Date.now();
      const chunkId = nanoid(6);
      const filename = `recordings/${this.spotId}/${this.feedId}/${timestamp}-${chunkId}.webm`;

      // Calculate MD5 checksum
      const checksum = await this.calculateChecksum(chunk);

      // Store metadata in Firestore
      await addDoc(collection(db, 'video_chunks'), {
        spotId: this.spotId,
        feedId: this.feedId,
        filename,
        url: URL.createObjectURL(chunk), // Create temporary URL for the chunk
        timestamp: serverTimestamp(),
        size: chunk.size,
        duration: this.recordingInterval / 1000,
        checksum
      });

      // Cleanup tracking
      this.uploadTasks.delete(chunkId);

    } catch (error) {
      console.error('Error processing chunk:', error);
      // Return chunk to queue for retry
      if (this.recordedChunks.length > 0) {
        this.recordedChunks.unshift(this.recordedChunks[0]);
      }
    }
  }

  private async calculateChecksum(blob: Blob): Promise<string> {
    const buffer = await blob.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('MD5', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  getUploadProgress(): { [key: string]: number } {
    const progress: { [key: string]: number } = {};
    this.uploadTasks.forEach((task, id) => {
      progress[id] = task.progress;
    });
    return progress;
  }

  stopRecording() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    if (this.mediaRecorder?.state === 'recording') {
      this.mediaRecorder.stop();
    }

    this.mediaRecorder = null;
    this.recordedChunks = [];
  }
}