import { storage } from '../firebase/config';
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject, listAll } from 'firebase/storage';
import { nanoid } from 'nanoid';
import { db } from '../firebase/config';
import { collection, addDoc, query, where, getDocs, serverTimestamp, orderBy, limit, Timestamp } from 'firebase/firestore';

interface VideoMetadata {
  id: string;
  userId: string;
  title: string;
  description?: string;
  url: string;
  thumbnailUrl?: string;
  duration: number;
  size: number;
  format: string;
  isPrivate: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface VideoChunk {
  id: string;
  spotId: string;
  feedId: string;
  filename: string;
  url: string;
  timestamp: Date;
  duration: number;
  size: number;
}

interface TranscodedChunk extends VideoChunk {
  transcodedUrl?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

export class VideoStorageService {
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private chunkInterval: number = 60000; // 1 minute per chunk
  private intervalId: number | null = null;
  private static readonly MIME_TYPES = [
    'video/webm;codecs=vp8',
    'video/webm',
    'video/webm;codecs=h264'
  ];
  private spotId: string;
  private feedId: string;
  private static readonly CHUNK_SIZE = 1024 * 1024 * 2; // 2MB chunks for better quality
  private static readonly SUPPORTED_FORMATS = ['video/mp4', 'video/webm'];
  private static readonly MAX_FILE_SIZE = 1024 * 1024 * 500; // 500MB
  private static readonly CHUNK_BUFFER_SIZE = 5; // Increased buffer for smoother playback
  private static readonly VIDEO_BITRATE = 1500000; // 1.5 Mbps for better compatibility
  private lastFrameAnalysis: number = 0;
  private static readonly FRAME_ANALYSIS_INTERVAL = 60000; // Analyze frame every minute

  constructor(spotId: string, feedId: string) {
    this.spotId = spotId;
    this.feedId = feedId;
  }

  static async getRecentChunks(spotId: string, feedId: string, minutes: number = 1): Promise<VideoChunk[]> {
    try {
      const chunksRef = collection(db, 'video_chunks');
      const timeAgo = new Date(Date.now() - minutes * 60 * 1000);
      
      const q = query(
        chunksRef,
        where('spotId', '==', spotId),
        where('feedId', '==', feedId),
        orderBy('timestamp', 'desc'),
        where('timestamp', '>=', Timestamp.fromDate(timeAgo)),
        limit(this.CHUNK_BUFFER_SIZE)
      );

      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        console.log('No video chunks found');
        return [];
      }

      const chunks = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        timestamp: doc.data().timestamp?.toDate() || new Date()
      })) as TranscodedChunk[];

      // Sort chunks by timestamp ascending for proper playback order
      return chunks
        .filter(chunk => chunk.timestamp)
        .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    } catch (error) {
      console.error('Error fetching video chunks:', error);
      if (error instanceof Error && error.message.includes('requires an index')) {
        console.error('Missing index - please create the required index in Firebase Console');
      }
      return [];
    }
  }

  static async uploadVideo(file: File, metadata: Omit<VideoMetadata, 'id' | 'url' | 'createdAt' | 'updatedAt'>): Promise<VideoMetadata> {
    try {
      // Validate file
      if (!this.SUPPORTED_FORMATS.includes(file.type)) {
        throw new Error('Unsupported video format. Please use MP4, WebM, or QuickTime.');
      }

      if (file.size > this.MAX_FILE_SIZE) {
        throw new Error('File size exceeds maximum limit of 500MB.');
      }

      // Generate unique ID for the video
      const videoId = nanoid();
      const fileName = `videos/${metadata.userId}/${videoId}/${file.name}`;
      const videoRef = storageRef(storage, fileName);

      // Upload video
      const snapshot = await uploadBytes(videoRef, file, {
        customMetadata: {
          userId: metadata.userId,
          title: metadata.title,
          isPrivate: metadata.isPrivate.toString()
        }
      });

      // Get download URL
      const url = await getDownloadURL(snapshot.ref);

      // Create video metadata in Firestore
      const videoMetadata: VideoMetadata = {
        id: videoId,
        userId: metadata.userId,
        title: metadata.title,
        description: metadata.description,
        url,
        thumbnailUrl: metadata.thumbnailUrl,
        duration: metadata.duration,
        size: file.size,
        format: file.type,
        isPrivate: metadata.isPrivate,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await addDoc(collection(db, 'videos'), {
        ...videoMetadata,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      return videoMetadata;
    } catch (error) {
      console.error('Error uploading video:', error);
      throw error;
    }
  }

  static async getVideos(userId: string, options: { 
    page?: number; 
    limit?: number; 
    search?: string;
    isPrivate?: boolean;
  } = {}): Promise<VideoMetadata[]> {
    try {
      const { page = 1, limit = 10, search, isPrivate } = options;
      const videosRef = collection(db, 'videos');
      
      // Build query
      let q = query(videosRef, where('userId', '==', userId));
      
      if (typeof isPrivate === 'boolean') {
        q = query(q, where('isPrivate', '==', isPrivate));
      }
      
      // Execute query
      const snapshot = await getDocs(q);
      let videos = snapshot.docs.map(doc => ({
        ...doc.data()
      })) as VideoMetadata[];

      // Apply search filter if provided
      if (search) {
        const searchLower = search.toLowerCase();
        videos = videos.filter(video => 
          video.title.toLowerCase().includes(searchLower) ||
          video.description?.toLowerCase().includes(searchLower)
        );
      }

      // Apply pagination
      const start = (page - 1) * limit;
      const end = start + limit;
      return videos.slice(start, end);
    } catch (error) {
      console.error('Error fetching videos:', error);
      throw error;
    }
  }

  static async deleteVideo(videoId: string, userId: string): Promise<void> {
    try {
      // Delete from Storage
      const videoRef = storageRef(storage, `videos/${userId}/${videoId}`);
      const files = await listAll(videoRef);
      
      await Promise.all([
        ...files.items.map(fileRef => deleteObject(fileRef)),
        ...files.prefixes.map(async prefix => {
          const subFiles = await listAll(prefix);
          return Promise.all(subFiles.items.map(fileRef => deleteObject(fileRef)));
        })
      ]);

      // Delete metadata from Firestore
      const videosRef = collection(db, 'videos');
      const q = query(videosRef, 
        where('id', '==', videoId),
        where('userId', '==', userId)
      );
      
      const snapshot = await getDocs(q);
      await Promise.all(snapshot.docs.map(doc => doc.ref.delete()));
    } catch (error) {
      console.error('Error deleting video:', error);
      throw error;
    }
  }

  async startRecording(stream: MediaStream) {
    try {
      // Find the first supported MIME type
      let supportedMimeType = null;
      for (const mimeType of VideoStorageService.MIME_TYPES) {
        if (MediaRecorder.isTypeSupported(mimeType)) {
          supportedMimeType = mimeType;
          console.log('Found supported MIME type:', mimeType);
          break;
        }
      }

      if (!supportedMimeType) {
        throw new Error('Video recording is not supported in this browser');
      }

      // Create MediaRecorder instance
      const options: MediaRecorderOptions = {
        mimeType: supportedMimeType,
        videoBitsPerSecond: VideoStorageService.VIDEO_BITRATE
      };
      
      this.mediaRecorder = new MediaRecorder(stream, options);
      console.log('MediaRecorder initialized with mime type:', supportedMimeType);

      // Handle data available event
      this.mediaRecorder.ondataavailable = async (event) => {
        if (event.data.size > 0) {
          // Capture and analyze first frame of new chunk
          if (Date.now() - this.lastFrameAnalysis >= VideoStorageService.FRAME_ANALYSIS_INTERVAL) {
            await this.analyzeFirstFrame(stream);
          }
          
          this.recordedChunks.push(event.data);
          await this.uploadChunk();
        }
      };

      // Start recording
      this.mediaRecorder.start();

      // Set up interval for chunks
      this.intervalId = window.setInterval(() => {
        if (this.mediaRecorder?.state === 'recording') {
          this.mediaRecorder.requestData(); // Trigger ondataavailable
        }
      }, this.chunkInterval);

    } catch (error) {
      console.error('Error starting recording:', error);
      throw error;
    }
  }

  private async analyzeFirstFrame(stream: MediaStream) {
    try {
      // Create canvas to capture frame
      const canvas = document.createElement('canvas');
      const video = document.createElement('video');
      video.srcObject = stream;
      
      // Wait for video to be ready
      await new Promise<void>((resolve) => {
        video.onloadedmetadata = () => {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          resolve();
        };
      });

      // Draw frame to canvas
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Could not get canvas context');
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert to base64
      const imageData = canvas.toDataURL('image/jpeg', 0.8);

      // Get spot details for custom instructions
      const spotsRef = collection(db, 'spots');
      const spotSnapshot = await getDocs(query(spotsRef, where('id', '==', this.spotId)));
      const spot = spotSnapshot.docs[0]?.data();

      if (!spot?.assistant?.customInstructions) {
        console.warn('No custom instructions found for spot');
        return;
      }

      // Store analysis in Firestore
      await addDoc(collection(db, 'analysis'), {
        spotId: this.spotId,
        feedId: this.feedId,
        timestamp: serverTimestamp(),
        imageData,
        customInstructions: spot.assistant.customInstructions,
        status: 'pending'
      });

      this.lastFrameAnalysis = Date.now();

    } catch (error) {
      console.error('Error analyzing frame:', error);
    }
  }

  private async uploadChunk() {
    try {
      if (this.recordedChunks.length === 0) return;
      
      const chunk = this.recordedChunks.shift();
      if (!chunk) return;

      const timestamp = Date.now();
      const chunkId = nanoid(6);
      const extension = 'webm';
      const filename = `recordings/${this.spotId}/${this.feedId}/${timestamp}-${chunkId}.${extension}`;
      
      const videoRef = storageRef(storage, filename);
      await uploadBytes(videoRef, chunk);
      const url = await getDownloadURL(videoRef);
      
      // Log chunk details for debugging
      console.log('Uploading chunk:', {
        mimeType: this.mediaRecorder?.mimeType,
        size: chunk.size,
        extension,
        filename
      });

      // Store chunk metadata in Firestore
      await addDoc(collection(db, 'video_chunks'), {
        spotId: this.spotId,
        feedId: this.feedId,
        filename,
        url,
        mimeType: this.mediaRecorder?.mimeType || 'video/webm',
        timestamp: Timestamp.now(),
        duration: this.chunkInterval / 1000,
        size: chunk.size
      });

      console.log('Chunk uploaded successfully:', filename);

    } catch (error) {
      console.error('Error processing chunk:', error);
      // Store failed chunk back in array for retry
      if (this.recordedChunks.length > 0) {
        this.recordedChunks.unshift(this.recordedChunks[0]);
      }
      throw error;
    }
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