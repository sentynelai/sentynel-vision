const API_URL = import.meta.env.PROD 
  ? '/.netlify/functions/mux'  // Production endpoint
  : 'http://localhost:3000/api/mux'; // Development endpoint

export interface MuxAsset {
  id: string;
  playbackId: string;
  status: string;
  duration: number;
  aspectRatio: string;
  createdAt: string;
}

export class MuxService {
  static async createLiveStream(spotId: string, feedId: string): Promise<{
    streamId: string;
    streamKey: string;
    playbackId: string;
  }> {
    try {
      const response = await fetch(`${API_URL}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ spotId, feedId })
      });

      if (!response.ok) {
        throw new Error('Failed to create live stream');
      }

      const data = await response.json();

      // Try to enable the stream immediately after creation
      try {
        await this.enableLiveStream(data.streamId);
      } catch (enableError) {
        console.warn('Initial stream enable failed:', enableError);
      }

      return data;
    } catch (error) {
      console.error('Error creating Mux live stream:', error);
      throw error;
    }
  }

  static async enableLiveStream(streamId: string): Promise<void> {
    try {
      const response = await fetch(`${API_URL}/${streamId}/enable`, {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error('Failed to enable stream');
      }
    } catch (error) {
      console.error('Error enabling Mux live stream:', error);
      throw error;
    }
  }

  static async getLiveStreamStatus(streamId: string): Promise<{
    status: 'active' | 'idle';
    playbackId: string;
  }> {
    try {
      const response = await fetch(`${API_URL}/${streamId}/status`);
      
      if (!response.ok) {
        throw new Error('Failed to get stream status');
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting Mux live stream status:', error);
      throw error;
    }
  }

  static async stopLiveStream(streamId: string): Promise<void> {
    try {
      const response = await fetch(`${API_URL}/${streamId}/stop`, {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error('Failed to stop stream');
      }
    } catch (error) {
      console.error('Error stopping Mux live stream:', error);
      throw error;
    }
  }

  static async deleteLiveStream(streamId: string): Promise<void> {
    try {
      const response = await fetch(`${API_URL}/${streamId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete stream');
      }
    } catch (error) {
      console.error('Error deleting Mux live stream:', error);
      throw error;
    }
  }

  static getPlaybackUrl(playbackId: string, type: 'live' | 'vod' = 'live'): string {
    return `https://stream.mux.com/${playbackId}.m3u8`;
  }

  static getThumbnailUrl(playbackId: string, options?: {
    time?: number;
    width?: number;
    height?: number;
  }): string {
    const { time = 0, width = 640, height = 360 } = options || {};
    return `https://image.mux.com/${playbackId}/thumbnail.jpg?time=${time}&width=${width}&height=${height}`;
  }

  static async createUploadUrl(): Promise<{
    uploadUrl: string;
    assetId: string;
  }> {
    try {
      const response = await fetch(`${API_URL}/upload-urls`, {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error('Failed to create upload URL');
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating Mux upload URL:', error);
      throw error;
    }
  }

  static async getAsset(assetId: string): Promise<MuxAsset> {
    try {
      const response = await fetch(`${API_URL}/assets/${assetId}`);

      if (!response.ok) {
        throw new Error('Failed to get asset');
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting Mux asset:', error);
      throw error;
    }
  }

  static async deleteAsset(assetId: string): Promise<void> {
    try {
      const response = await fetch(`${API_URL}/assets/${assetId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete asset');
      }
    } catch (error) {
      console.error('Error deleting Mux asset:', error);
      throw error;
    }
  }
}