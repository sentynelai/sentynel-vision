import { db as firestore } from '../firebase/config';
import { doc, onSnapshot, updateDoc, setDoc, serverTimestamp } from 'firebase/firestore';

export class WebRTCService {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private recordingService: VideoRecordingService | null = null;
  private spotId: string;
  private feedId: string;
  private signalingUnsubscribe: (() => void) | null = null;
  private isConnected = false;
  private connectionTimeout: number | null = null;
  private maxAttempts = 5;
  private currentAttempt = 0;
  private pendingCandidates: RTCIceCandidateInit[] = [];
  private remoteDescriptionSet = false;
  private signalingQueue: any[] = [];
  private processingSignaling = false;
  private hasReceivedOffer = false;
  private hasReceivedAnswer = false;

  constructor(spotId: string, feedId: string) {
    console.log('Initializing WebRTC service for:', spotId, feedId);
    this.spotId = spotId;
    this.feedId = feedId;

    // Initialize recording service
    this.recordingService = new VideoRecordingService(spotId, feedId);

    this.peerConnection = new RTCPeerConnection({
      iceServers: [
        { urls: [
          'stun:stun.l.google.com:19302',
          'stun:stun1.l.google.com:19302',
          'stun:stun2.l.google.com:19302',
          'stun:stun3.l.google.com:19302'
        ]}
      ]
    });
    
    // Handle tracks immediately when they're received
    this.peerConnection.ontrack = (event) => {
      console.log('Received track:', event.track.kind);
      if (!this.remoteStream) {
        this.remoteStream = new MediaStream();
      }
      this.remoteStream?.addTrack(event.track);
      this.isConnected = true;
      this.currentAttempt = 0;
    };

    // Set up ICE candidate handling
    this.peerConnection.onicecandidate = async (event) => {
      if (event.candidate) {
        try {
          console.log('Generated ICE candidate:', event.candidate);
          await this.sendSignalingData({
            type: 'ice-candidate',
            candidate: event.candidate.toJSON()
          });
        } catch (error) {
          console.error('Error sending ICE candidate:', error);
        }
      }
    };

    // Connection state changes
    this.peerConnection.onconnectionstatechange = () => {
      console.log('Connection state:', this.peerConnection?.connectionState);
      switch (this.peerConnection?.connectionState) {
        case 'connected':
          this.isConnected = true;
          this.currentAttempt = 0;
          this.clearConnectionTimeout();
          break;
          
        case 'failed':
          if (this.currentAttempt < this.maxAttempts) {
            console.log('Connection failed, attempting reconnect...');
            this.currentAttempt++;
            this.restartConnection();
          }
          break;
          
        case 'disconnected':
          this.startConnectionTimeout();
          break;
      }
    };

    // Handle ICE connection state changes
    this.peerConnection.oniceconnectionstatechange = () => {
      console.log('ICE connection state:', this.peerConnection?.iceConnectionState);
      this.isConnected = this.peerConnection?.iceConnectionState === 'connected';
    };
  }

  async startLocalStream(mediaStream: MediaStream): Promise<MediaStream> {
    try {
      this.localStream = mediaStream;
      
      // Start recording in parallel
      if (this.recordingService) {
        await this.recordingService.startRecording(mediaStream.clone());
      }
      
      // Add tracks to peer connection
      this.localStream.getTracks().forEach(track => {
        if (this.peerConnection && this.localStream) {
          this.peerConnection.addTrack(track, this.localStream);
        }
      });
      
      return this.localStream;
    } catch (error) {
      console.error('Error setting up local stream:', error);
      throw error;
    }
  }

  private startConnectionTimeout() {
    this.clearConnectionTimeout();
    this.connectionTimeout = window.setTimeout(() => {
      if (!this.isConnected && this.currentAttempt < this.maxAttempts) {
        console.log('Connection timeout, attempting reconnect...');
        this.currentAttempt++;
        this.restartConnection();
      }
    }, 5000);
  }

  private clearConnectionTimeout() {
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }
  }

  private async restartConnection() {
    try {
      if (this.peerConnection) {
        // Close existing connection
        this.peerConnection.close();
        
        // Create new connection
        this.peerConnection = new RTCPeerConnection({
          iceServers: [
            { urls: [
              'stun:stun.l.google.com:19302',
              'stun:stun1.l.google.com:19302',
              'stun:stun2.l.google.com:19302',
              'stun:stun3.l.google.com:19302'
            ]}
          ]
        });

        // Re-add tracks
        if (this.localStream) {
          this.localStream.getTracks().forEach(track => {
            this.peerConnection?.addTrack(track, this.localStream!);
          });
        }
        
        // Restart ICE
        const offer = await this.peerConnection.createOffer({ iceRestart: true });
        await this.peerConnection.setLocalDescription(offer);
        
        // Send the new offer
        await this.sendSignalingData({
          type: 'offer',
          offer
        });
      }
    } catch (error) {
      console.error('Error restarting connection:', error);
    }
  }

  // For the broadcasting side (mobile device)
  async createOffer(): Promise<RTCSessionDescriptionInit> {
    if (!this.peerConnection) throw new Error('PeerConnection not initialized');
    
    try {
      const offer = await this.peerConnection.createOffer();
      console.log('Created offer');
      await this.peerConnection.setLocalDescription(offer);
      console.log('Set local description (offer)');
      
      // Process any pending candidates after setting local description
      if (this.pendingCandidates.length > 0) {
        console.log('Processing pending candidates after setting local description');
        for (const candidate of this.pendingCandidates) {
          await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        }
        this.pendingCandidates = [];
      }
      
      return offer;
    } catch (error) {
      console.error('Error creating offer:', error);
      throw error;
    }
  }

  // For the viewing side (spot owner)
  async createAnswer(offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
    if (!this.peerConnection) throw new Error('PeerConnection not initialized');
    
    console.log('Creating answer for offer');
    
    try {
      await this.peerConnection.setRemoteDescription(offer);
      this.remoteDescriptionSet = true;
      const answer = await this.peerConnection.createAnswer();
      console.log('Created answer:', answer);
      await this.peerConnection.setLocalDescription(answer);
      
      // Process any pending candidates after setting remote description
      if (this.pendingCandidates.length > 0) {
        console.log('Processing pending ICE candidates:', this.pendingCandidates.length);
        for (const candidate of this.pendingCandidates) {
          await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        }
        this.pendingCandidates = [];
      }
      
      return answer;
    } catch (error) {
      console.error('Error creating answer:', error);
      throw error;
    }
  }

  // Send signaling data through Firebase
  async sendSignalingData(data: any) {
    try {
      console.log('Sending signaling data type:', data.type);
      if (!this.spotId || !this.feedId) {
        throw new Error('Spot ID and Feed ID are required for signaling');
      }

      const signalingId = `${this.spotId}-${this.feedId}`;
      const signalingDoc = doc(firestore, 'signaling', signalingId);
      
      await setDoc(signalingDoc, 
        {
          ...data,
          spotId: this.spotId,
          feedId: this.feedId,
          timestamp: serverTimestamp(),
        },
        { merge: true }
      );
      console.log('Signaling data sent successfully');
    } catch (error) {
      console.error('Error sending signaling data:', error);
      throw error;
    }
  }

  // Start listening for signaling data
  startSignaling(onSignalingData: (data: any) => void): void {
    console.log('Starting signaling listener');
    if (!this.spotId || !this.feedId) {
      console.error('Spot ID and Feed ID are required for signaling');
      return;
    }

    const signalingDoc = doc(firestore, 'signaling', `${this.spotId}-${this.feedId}`);
    
    this.signalingUnsubscribe = onSnapshot(signalingDoc, (snapshot) => {
      try {
        const data = snapshot.data();
        if (data && data.type && data.timestamp) {
          console.log('Received signaling data type:', data.type);
          if (data.type !== 'ice-candidate' || data.candidate) {
            this.signalingQueue.push(data);
            this.processSignalingQueue(onSignalingData);
          }
        }
      } catch (error) {
        console.error('Error in signaling snapshot:', error);
      }
    });
  }

  private async processSignalingQueue(onSignalingData: (data: any) => void) {
    console.log("this.processingSignaling", this.processingSignaling);
    if (this.processingSignaling) return;
    this.processingSignaling = true;

    try {
      console.log("this.signalingQueue.length", this.signalingQueue.length);
      // First process offer if present
      const offerData = this.signalingQueue.find(data => data.type === 'offer');
      if (offerData && !this.hasReceivedOffer) {
        console.log('Processing offer');
        this.hasReceivedOffer = true;
        await onSignalingData(offerData);
        this.signalingQueue = this.signalingQueue.filter(data => data !== offerData);
      }

      // Then process answer if present
      const answerData = this.signalingQueue.find(data => data.type === 'answer');
      if (answerData && !this.hasReceivedAnswer) {
        console.log('Processing answer');
        this.hasReceivedAnswer = true;
        await onSignalingData(answerData);
        this.signalingQueue = this.signalingQueue.filter(data => data !== answerData);
      }

      // Only process ICE candidates after offer/answer exchange
      if ((this.hasReceivedOffer || this.hasReceivedAnswer) && this.remoteDescriptionSet) {
        const candidates = this.signalingQueue.filter(data => data.type === 'ice-candidate');
        console.log('Processing ICE candidates:', candidates.length);
        for (const candidate of candidates) {
          await onSignalingData(candidate);
        }
        this.signalingQueue = this.signalingQueue.filter(data => data.type !== 'ice-candidate');
      }
    } catch (error) {
      console.error('Error processing signaling queue:', error);
    } finally {
      this.processingSignaling = false;
    }
  }

  async handleAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
    if (!this.peerConnection) throw new Error('PeerConnection not initialized');
    
    console.log('Setting remote description (answer)', answer);

    try {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
      console.log('Remote description (answer) set successfully');
      this.remoteDescriptionSet = true;
      
      // Process any pending candidates
      if (this.pendingCandidates.length > 0) {
        console.log('Processing pending candidates:', this.pendingCandidates.length);
        for (const candidate of this.pendingCandidates) {
          await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        }
        this.pendingCandidates = [];
      }
    } catch (error) {
      console.error('Error handling answer:', error);
      throw error;
    }
  }

  async handleIceCandidate(candidate: RTCIceCandidateInit) {
    if (!this.peerConnection) throw new Error('PeerConnection not initialized');
    
    console.log('Handling ICE candidate');

    try {
      if (!candidate || !candidate.candidate) {
        console.log('Skipping null candidate');
        return;
      }

      // Queue candidate if we don't have a remote description yet
      if (!this.remoteDescriptionSet) {
        console.log('Remote description not set yet, queueing candidate');
        this.pendingCandidates.push(candidate);
        return;
      }

      // Create a new RTCIceCandidate
      const iceCandidate = new RTCIceCandidate(candidate);
      await this.peerConnection.addIceCandidate(iceCandidate);
      console.log('Added ICE candidate successfully');
    } catch (error) {
      console.error('Error handling ICE candidate:', error);
      // Don't throw error for ICE candidate failures, just log them
      console.warn('Failed to add ICE candidate:', error);
    }
  }

  onTrack(callback: (stream: MediaStream) => void): void {
    if (!this.peerConnection) return;
    
    // Call callback immediately if we already have a remote stream
    if (this.remoteStream && this.remoteStream.getTracks().length > 0) {
      callback(this.remoteStream);
    }

    // Set up track handler
    this.peerConnection.ontrack = async (event) => {
      if (!this.remoteStream) {
        this.remoteStream = new MediaStream();
      }
      event.streams[0].getTracks().forEach(track => {
        console.log('Adding track to remote stream:', track.kind);
        this.remoteStream?.addTrack(track);
      });
      await callback(this.remoteStream);
    }
  }

  isStreamConnected(): boolean {
    return this.isConnected;
  }

  close(): void {
    this.clearConnectionTimeout();

    // Clean up signaling
    if (this.recordingService) {
      this.recordingService.stopRecording();
      this.recordingService = null;
    }

    if (this.signalingUnsubscribe) {
      this.signalingUnsubscribe();
      this.signalingUnsubscribe = null;
    }

    // Stop all tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
    }
    if (this.remoteStream) {
      this.remoteStream.getTracks().forEach(track => track.stop());
    }

    // Close peer connection
    if (this.peerConnection) {
      this.peerConnection.close();
    }

    // Reset state
    this.localStream = null;
    this.remoteStream = null;
    this.hasReceivedOffer = false;
    this.hasReceivedAnswer = false;
    this.remoteDescriptionSet = false;
    this.peerConnection = null;
    this.signalingQueue = [];
    this.isConnected = false;
    this.pendingCandidates = [];
    this.currentAttempt = 0;
  }
}