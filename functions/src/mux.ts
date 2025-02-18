import * as functions from 'firebase-functions';
import Mux from '@mux/mux-node';

// Initialize Mux client
const mux = new Mux({
  tokenId: process.env.MUX_ACCESS_TOKEN_ID,
  tokenSecret: process.env.MUX_SECRET_KEY
});

const Video = mux.Video;

export const createLiveStream = functions.https.onCall(async (data, context) => {
  try {
    const { spotId, feedId } = data;
    
    if (!spotId || !feedId) {
      throw new Error('Missing required parameters');
    }

    const response = await Video.LiveStreams.create({
      playback_policy: 'public',
      new_asset_settings: {
        playback_policy: 'public'
      },
      reduced_latency: true,
      test: false,
      passthrough: `${spotId}:${feedId}`
    });

    return {
      streamKey: response.stream_key,
      playbackId: response.playback_ids?.[0]?.id || ''
    };
  } catch (error) {
    console.error('Error creating live stream:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

export const getLiveStreamStatus = functions.https.onCall(async (data, context) => {
  try {
    const { streamId } = data;
    
    if (!streamId) {
      throw new Error('Missing stream ID');
    }

    const stream = await Video.LiveStreams.get(streamId);
    
    return {
      status: stream.status === 'active' ? 'active' : 'idle',
      playbackId: stream.playback_ids?.[0]?.id || ''
    };
  } catch (error) {
    console.error('Error getting stream status:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

export const stopLiveStream = functions.https.onCall(async (data, context) => {
  try {
    const { streamId } = data;
    
    if (!streamId) {
      throw new Error('Missing stream ID');
    }

    await Video.LiveStreams.disable(streamId);
    return { success: true };
  } catch (error) {
    console.error('Error stopping stream:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

export const deleteLiveStream = functions.https.onCall(async (data, context) => {
  try {
    const { streamId } = data;
    
    if (!streamId) {
      throw new Error('Missing stream ID');
    }

    await Video.LiveStreams.delete(streamId);
    return { success: true };
  } catch (error) {
    console.error('Error deleting stream:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});