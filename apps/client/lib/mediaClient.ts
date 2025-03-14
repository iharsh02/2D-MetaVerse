import mediasoup from 'mediasoup-client';
import { Socket } from 'socket.io-client';
import { Device } from 'mediasoup-client';

export class MediaClient {
  private device: Device;
  private sendTransport?: mediasoup.types.Transport;
  private producers = new Map<string, mediasoup.types.Producer>();
  private audioProducer?: mediasoup.types.Producer;
  private videoProducer?: mediasoup.types.Producer;
  private recvTransport: any; // Use proper type from mediasoup-client

  constructor() {
    this.device = new Device();
  }

  async initialize(socket: Socket) {
    try {
      const routerRtpCapabilities = await socket.emitWithAck('getRouterCapabilities');
      if (!routerRtpCapabilities || routerRtpCapabilities.error) {
        console.error("Failed to get router capabilities:", routerRtpCapabilities?.error);
        return false;
      }
      
      await this.device.load({ routerRtpCapabilities });
      
      // Create receive transport immediately
      const recvTransportInfo = await socket.emitWithAck('createRecvTransport');
      if (recvTransportInfo.error) {
        console.warn("Receive transport warning:", recvTransportInfo.error);
        return false;
      }
      
      this.recvTransport = this.device.createRecvTransport({
        id: recvTransportInfo.id,
        iceParameters: recvTransportInfo.iceParameters,
        iceCandidates: recvTransportInfo.iceCandidates,
        dtlsParameters: recvTransportInfo.dtlsParameters,
        appData: { socket }
      });
      
      this.recvTransport.on('connect', ({ dtlsParameters }: { dtlsParameters: mediasoup.types.DtlsParameters }, callback: () => void) => {
        socket.emit('connectRecvTransport', { dtlsParameters }, callback);
      });
      
      return true;
    } catch (error) {
      console.error("Failed to initialize media client:", error);
      return false;
    }
  }

  async joinMediaGroup(socket: Socket) {
    try {
      const transportInfo = await socket.emitWithAck('createTransport');
      
      // Check for errors but don't fail completely
      if (transportInfo.error) {
        console.warn("Transport warning:", transportInfo.error);
        
        // Special handling for being alone
        if (transportInfo.isAlone) {
          console.info("You're the only player. Media will work when others join.");
        }
        
        return null;
      }
      
      // Continue with transport setup
      if (!transportInfo.id || !transportInfo.iceParameters || 
          !transportInfo.iceCandidates || !transportInfo.dtlsParameters) {
        console.error("Invalid transport info received:", transportInfo);
        return null;
      }
      
      this.sendTransport = this.device.createSendTransport({
        id: transportInfo.id,
        iceParameters: transportInfo.iceParameters,
        iceCandidates: transportInfo.iceCandidates,
        dtlsParameters: transportInfo.dtlsParameters,
        appData: { socket }
      });

      // Setup transport handlers
      this.sendTransport.on('connect', async ({ dtlsParameters }: { dtlsParameters: mediasoup.types.DtlsParameters }, callback: () => void) => {
        socket.emit('connectTransport', { dtlsParameters }, callback);
      });

      this.sendTransport.on('produce', async ({ kind, rtpParameters }: { kind: string, rtpParameters: mediasoup.types.RtpParameters }, callback: (data: { id: string }) => void) => {
        try {
          const response = await socket.emitWithAck('produce', { kind, rtpParameters });
          if (response.error) {
            console.error("Production failed:", response.error);
            throw new Error(response.error);
          }
          callback({ id: response.id });
        } catch (err) {
          console.error("Failed to produce:", err);
          callback({ id: 'error' });
        }
      });
      
      // Let the app know if user is alone (for UI feedback)
      if (transportInfo.isAlone) {
        console.info("Transport created, but you're the only player nearby.");
      }
      
      return this.sendTransport;
    } catch (error) {
      console.error("Failed to join media group:", error);
      return null;
    }
  }

  async startLocalStream(type: 'video'|'audio') {
    const stream = await navigator.mediaDevices.getUserMedia({ [type]: true });
    const track = stream.getTracks()[0];
    
    const producer = await this.sendTransport?.produce({
      track,
      stopTracks: false
    });

    if (producer) this.producers.set(producer.id, producer);
    return stream;
  }

  async toggleAudio() {
    try {
      // If we're enabling audio
      if (!this.audioProducer) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const track = stream.getAudioTracks()[0];
        
        if (!track) {
          console.error("No audio track found");
          return stream;
        }
        
        // Ensure track is properly configured for audio
        track.enabled = true; // Make sure track is enabled

        // Add a null check for sendTransport
        if (!this.sendTransport) {
          console.error("Send transport not initialized");
          return stream;
        }

        // Create producer with explicit audio settings
        this.audioProducer = await this.sendTransport.produce({
          track,
          codecOptions: {
            opusStereo: true,
            opusDtx: true,
            opusFec: true,
            opusMaxPlaybackRate: 48000
          },
          appData: { source: 'microphone' }
        });
        
        return stream;
      } else {
        // Disable existing audio
        const track = this.audioProducer.track;
        this.audioProducer.close();
        if (track) {
          track.stop();
        }
        this.audioProducer = undefined;
        return null;
      }
    } catch (error) {
      console.error("Error toggling audio:", error);
      return null;
    }
  }

  async toggleVideo() {
    try {
      if (this.videoProducer) {
        // Disable existing video
        const track = this.videoProducer.track;
        this.videoProducer.close();
        if (track) {
          track.stop();
        }
        this.videoProducer = undefined;
        return null;
      } else {
        // Enable video
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        const track = stream.getVideoTracks()[0];
        
        if (!track) {
          console.error("No video track found");
          return stream;
        }
        
        // Ensure track is properly configured
        track.enabled = true;
        
        if (!this.sendTransport) {
          console.error("Send transport not initialized");
          return stream;
        }
        
        // Create producer with explicit video settings
        this.videoProducer = await this.sendTransport.produce({
          track,
          codecOptions: {
            videoGoogleStartBitrate: 1000
          },
          appData: { source: 'camera' }
        });
        
        return stream;
      }
    } catch (error) {
      console.error("Error toggling video:", error);
      return null;
    }
  }

  async loadDevice(routerRtpCapabilities: any) {
    await this.device.load({ routerRtpCapabilities });
  }

  async createRecvTransport(transportOptions: any) {
    this.recvTransport = this.device.createRecvTransport(transportOptions);
    
    this.recvTransport.on('connect', async ({ dtlsParameters }: { dtlsParameters: mediasoup.types.DtlsParameters }, callback: () => void) => {
      // Signal to the server to connect the transport
      fetch('/api/connect-transport', {
        method: 'POST',
        body: JSON.stringify({ dtlsParameters })
      }).then(() => callback()).catch(err => console.error(err));
    });
    
    return this.recvTransport;
  }

  async consumeTrack(producerId: string) {
    if (!this.recvTransport || !this.device.rtpCapabilities) {
      console.error("Cannot consume without a receive transport and RTP capabilities");
      return null;
    }
    
    // Get the socket from appData
    const socket = this.recvTransport.appData.socket;
    if (!socket) {
      console.error("No socket available in transport appData");
      return null;
    }
    
    try {
      // Request consumer parameters from the server
      const consumerParameters = await socket.emitWithAck(
        'consume', 
        { 
          producerId,
          rtpCapabilities: this.device.rtpCapabilities 
        }
      );
      
      if (consumerParameters.error) {
        console.error("Error consuming track:", consumerParameters.error);
        return null;
      }
      
      // Create the consumer
      const consumer = await this.recvTransport.consume({
        id: consumerParameters.id,
        producerId,
        kind: consumerParameters.kind,
        rtpParameters: consumerParameters.rtpParameters
      });
      
      // Resume the consumer
      await consumer.resume();
      
      return consumer;
    } catch (error) {
      console.error("Failed to consume track:", error);
      return null;
    }
  }
} 