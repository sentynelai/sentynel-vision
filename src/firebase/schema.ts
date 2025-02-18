// Firestore Collections Schema

// spots collection
interface Spot {
  id: string;
  name: string;
  userId: string;
  videoFeeds: VideoFeed[];
  aiSettings: AISettings;
  assistant: AssistantSettings;
  createdAt: Date;
  updatedAt: Date;
}

// video_chunks collection
interface VideoChunk {
  id: string;
  spotId: string;
  feedId: string;
  filename: string;
  url: string;
  timestamp: Date;
  duration: number;
  size: number;
  status: 'pending' | 'processing' | 'ready' | 'error';
  checksum: string;
  metadata?: {
    width: number;
    height: number;
    fps: number;
    codec: string;
  };
}

// analysis_results collection
interface AnalysisResult {
  id: string;
  spotId: string;
  feedId: string;
  chunkId: string;
  timestamp: Date;
  objects: string[];
  events: string[];
  summary: string;
  confidence: number;
  alerts: {
    level: 'info' | 'warning' | 'critical';
    message: string;
    timestamp: Date;
  }[];
}

// reports collection
interface Report {
  id: string;
  spotId: string;
  feedId: string;
  startTime: Date;
  endTime: Date;
  summary: string;
  metrics: {
    totalObjects: number;
    uniqueEvents: number;
    alertCount: number;
    peopleCount: number;
  };
  recommendations: string[];
  generatedAt: Date;
}

export type { Spot, VideoChunk, AnalysisResult, Report };