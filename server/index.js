import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import Mux from '@mux/mux-node';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Initialize Mux client
const mux = new Mux({
  tokenId: process.env.VITE_MUX_ACCESS_TOKEN_ID,
  tokenSecret: process.env.VITE_MUX_SECRET_KEY
});

const { Video } = mux;

// Middleware
app.use(cors());
app.use(express.json());

// Error handling for missing credentials
if (!process.env.VITE_MUX_ACCESS_TOKEN_ID || !process.env.VITE_MUX_SECRET_KEY) {
  console.error('Error: Mux API credentials not found in environment variables');
  process.exit(1);
}

// Routes
app.post('/api/mux/live-streams', async (req, res) => {
  try {
    const { spotId, feedId } = req.body;
    
    const response = await Video.LiveStreams.create({
      playback_policy: 'public',
      new_asset_settings: {
        playback_policy: 'public'
      },
      reduced_latency: true,
      test: false,
      passthrough: `${spotId}:${feedId}`
    });

    res.json({
      streamKey: response.stream_key,
      playbackId: response.playback_ids?.[0]?.id || ''
    });
  } catch (error) {
    console.error('Error creating live stream:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/mux/live-streams/:streamId/status', async (req, res) => {
  try {
    const { streamId } = req.params;
    const stream = await Video.LiveStreams.get(streamId);
    
    res.json({
      status: stream.status === 'active' ? 'active' : 'idle',
      playbackId: stream.playback_ids?.[0]?.id || ''
    });
  } catch (error) {
    console.error('Error getting stream status:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/mux/live-streams/:streamId/stop', async (req, res) => {
  try {
    const { streamId } = req.params;
    await Video.LiveStreams.disable(streamId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error stopping stream:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/mux/live-streams/:streamId', async (req, res) => {
  try {
    const { streamId } = req.params;
    await Video.LiveStreams.delete(streamId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting stream:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/mux/upload-urls', async (req, res) => {
  try {
    const upload = await Video.Uploads.create({
      new_asset_settings: {
        playback_policy: 'public'
      },
      cors_origin: '*'
    });

    res.json({
      uploadUrl: upload.url,
      assetId: upload.asset_id
    });
  } catch (error) {
    console.error('Error creating upload URL:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/mux/assets/:assetId', async (req, res) => {
  try {
    const { assetId } = req.params;
    const asset = await Video.Assets.get(assetId);
    
    res.json({
      id: asset.id,
      playbackId: asset.playback_ids?.[0]?.id || '',
      status: asset.status,
      duration: asset.duration || 0,
      aspectRatio: asset.aspect_ratio || '16:9',
      createdAt: asset.created_at
    });
  } catch (error) {
    console.error('Error getting asset:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/mux/assets/:assetId', async (req, res) => {
  try {
    const { assetId } = req.params;
    await Video.Assets.delete(assetId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting asset:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});