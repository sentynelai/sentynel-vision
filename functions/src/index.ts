import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { Storage } from '@google-cloud/storage';
export * from './mux';
import * as ffmpeg from 'fluent-ffmpeg';
import * as ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import { file as tmpFile } from 'tmp-promise';
import * as fs from 'fs';
import * as path from 'path';

// Initialize Firebase Admin
admin.initializeApp();

// Initialize Cloud Storage
const storage = new Storage();
const bucket = storage.bucket('sentynel-vision.appspot.com');

// Set ffmpeg path
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

// Configure HLS settings
const HLS_SEGMENT_DURATION = 6; // seconds
const QUALITY_VARIANTS = [
  { height: 720, bitrate: '2500k' },
  { height: 480, bitrate: '1000k' },
  { height: 360, bitrate: '600k' }
];

interface VideoMetadata {
  spotId: string;
  feedId: string;
  duration: number;
  size: number;
  checksum: string;
}

export const processVideoUpload = functions.storage
  .object()
  .onFinalize(async (object) => {
    const filePath = object.name;
    if (!filePath) return;

    // Only process files in the recordings folder
    if (!filePath.startsWith('recordings/')) {
      console.log('Skipping non-recording file:', filePath);
      return;
    }

    // Extract metadata
    const metadata = object.metadata as VideoMetadata;
    if (!metadata?.spotId || !metadata?.feedId) {
      console.error('Missing required metadata');
      return;
    }

    try {
      // Create temporary directory for processing
      const { path: tmpDir, cleanup } = await tmpFile({ postfix: '.tmp' });
      const workDir = path.dirname(tmpDir);

      try {
        // Download source file
        const tempInputPath = path.join(workDir, 'input.webm');
        await bucket.file(filePath).download({ destination: tempInputPath });

        // Generate HLS manifest and segments
        const outputDir = path.join(workDir, 'output');
        fs.mkdirSync(outputDir, { recursive: true });

        // Create master playlist
        let masterPlaylist = '#EXTM3U\n#EXT-X-VERSION:3\n';

        // Process each quality variant
        for (const variant of QUALITY_VARIANTS) {
          const variantDir = path.join(outputDir, `${variant.height}p`);
          fs.mkdirSync(variantDir, { recursive: true });

          const outputPath = path.join(variantDir, 'stream.m3u8');
          
          await new Promise((resolve, reject) => {
            ffmpeg(tempInputPath)
              .outputOptions([
                '-c:v libx264',
                '-c:a aac',
                '-b:v ' + variant.bitrate,
                '-maxrate ' + variant.bitrate,
                '-bufsize ' + parseInt(variant.bitrate) * 2 + 'k',
                '-vf scale=-2:' + variant.height,
                '-preset veryfast',
                '-g 48',
                '-sc_threshold 0',
                '-map 0',
                '-f hls',
                '-hls_time ' + HLS_SEGMENT_DURATION,
                '-hls_playlist_type vod',
                '-hls_segment_filename ' + path.join(variantDir, 'segment_%d.ts')
              ])
              .output(outputPath)
              .on('end', resolve)
              .on('error', reject)
              .run();
          });

          // Add variant to master playlist
          masterPlaylist += `#EXT-X-STREAM-INF:BANDWIDTH=${parseInt(variant.bitrate) * 1000},RESOLUTION=${variant.height}p\n`;
          masterPlaylist += `${variant.height}p/stream.m3u8\n`;
        }

        // Write master playlist
        fs.writeFileSync(path.join(outputDir, 'master.m3u8'), masterPlaylist);

        // Upload processed files
        const uploadDir = `processed/${metadata.spotId}/${metadata.feedId}/${path.basename(filePath, '.webm')}`;
        
        // Upload master playlist
        await bucket.upload(path.join(outputDir, 'master.m3u8'), {
          destination: `${uploadDir}/master.m3u8`,
          metadata: {
            contentType: 'application/vnd.apple.mpegurl',
            metadata: {
              spotId: metadata.spotId,
              feedId: metadata.feedId
            }
          }
        });

        // Upload variant playlists and segments
        for (const variant of QUALITY_VARIANTS) {
          const variantDir = path.join(outputDir, `${variant.height}p`);
          const files = fs.readdirSync(variantDir);

          for (const file of files) {
            const filePath = path.join(variantDir, file);
            await bucket.upload(filePath, {
              destination: `${uploadDir}/${variant.height}p/${file}`,
              metadata: {
                contentType: file.endsWith('.m3u8') 
                  ? 'application/vnd.apple.mpegurl'
                  : 'video/MP2T',
                metadata: {
                  spotId: metadata.spotId,
                  feedId: metadata.feedId,
                  quality: `${variant.height}p`
                }
              }
            });
          }
        }

        // Update video chunk status in Firestore
        const chunkId = path.basename(filePath, '.webm');
        await admin.firestore()
          .collection('video_chunks')
          .doc(chunkId)
          .update({
            status: 'ready',
            processedUrl: `${uploadDir}/master.m3u8`,
            qualities: QUALITY_VARIANTS.map(v => v.height + 'p'),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });

      } finally {
        // Cleanup temporary files
        await cleanup();
      }

    } catch (error) {
      console.error('Error processing video:', error);
      
      // Update chunk status to error
      const chunkId = path.basename(filePath, '.webm');
      await admin.firestore()
        .collection('video_chunks')
        .doc(chunkId)
        .update({
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
    }
  });

// Cleanup old processed videos
export const cleanupOldVideos = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async () => {
    const RETENTION_DAYS = 7;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS);

    try {
      // Delete old files from Storage
      const [files] = await bucket.getFiles({
        prefix: 'processed/'
      });

      for (const file of files) {
        const metadata = file.metadata;
        if (new Date(metadata.timeCreated) < cutoffDate) {
          await file.delete();
        }
      }

      // Update Firestore records
      const chunksRef = admin.firestore().collection('video_chunks');
      const snapshot = await chunksRef
        .where('timestamp', '<', cutoffDate)
        .get();

      const batch = admin.firestore().batch();
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      await batch.commit();

    } catch (error) {
      console.error('Error cleaning up old videos:', error);
    }
  });