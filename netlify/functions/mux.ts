import { Handler } from '@netlify/functions';
import Mux from '@mux/mux-node';

// Initialize Mux client
const mux = new Mux({
  tokenId: process.env.MUX_ACCESS_TOKEN_ID!,
  tokenSecret: process.env.MUX_SECRET_KEY!
});

const Video = mux.video;

export const handler: Handler = async (event, context) => {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers
    };
  }

  try {
    const path = event.path.replace('/.netlify/functions/mux', '');
    const pathParts = path.split('/').filter(Boolean);

    // Create live stream
    if (event.httpMethod === 'POST' && !pathParts.length) {
      const { spotId, feedId } = JSON.parse(event.body || '{}');

      const response = await Video.liveStreams.create({
        playback_policy: ['public'],
        new_asset_settings: {
          playback_policy: ['public']
        },
        reduced_latency: true,
        test: false,
        passthrough: `${spotId}:${feedId}`
      });

      // Immediately enable the stream
      try {
        await Video.liveStreams.enable(response.id);
      } catch (enableError) {
        console.error('Error enabling stream:', enableError);
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          streamId: response.id,
          streamKey: response.stream_key,
          playbackId: response.playback_ids?.[0]?.id || ''
        })
      };
    }

    // Enable stream
    if (event.httpMethod === 'POST' && pathParts[0] && pathParts[1] === 'enable') {
      const streamId = pathParts[0];
      await Video.liveStreams.enable(streamId);
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true })
      };
    }

    // Get stream status
    if (event.httpMethod === 'GET' && pathParts[0] && pathParts[1] === 'status') {
      const streamId = pathParts[0];
      
      console.log('Retrieving stream status for ID:', streamId);

      try {
        const stream = await Video.liveStreams.retrieve(streamId);
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            status: stream.status === 'active' ? 'active' : 'idle',
            playbackId: stream.playback_ids?.[0]?.id || ''
          })
        };
      } catch (error) {
        console.error('Error retrieving stream:', error);
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ 
            error: 'Invalid stream ID or stream not found',
            details: error.message 
          })
        };
      }
    }

    // Stop stream
    if (event.httpMethod === 'POST' && pathParts[0] && pathParts[1] === 'stop') {
      const streamId = pathParts[0];
      await Video.liveStreams.disable(streamId);
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true })
      };
    }

    // Delete stream
    if (event.httpMethod === 'DELETE' && pathParts[0]) {
      const streamId = pathParts[0];
      await Video.liveStreams.delete(streamId);
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true })
      };
    }

    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'Not found' })
    };

  } catch (error: any) {
    console.error('Mux API error:', error);
    
    return {
      statusCode: error.status || 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};