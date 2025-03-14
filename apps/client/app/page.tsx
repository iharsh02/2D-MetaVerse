"use client";
import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import AppBar from "@/components/AppBar";
import Canvas from "@/components/canvas";
import ChatBox from "@/components/chat";
import AudioMeter from "@/components/AudioMeter";

const getMediaClient = () => {
  if (typeof window === 'undefined') return null;
  const { MediaClient } = require('@/lib/mediaClient');
  return new MediaClient();
};

export default function Home() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [mediaClient, setMediaClient] = useState<any>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [videoEnabled, setVideoEnabled] = useState(false);

  // Initialize socket
  useEffect(() => {
    const newSocket = io("http://localhost:8080");
    setSocket(newSocket);
    return () => { newSocket.disconnect(); };
  }, []);

  // Initialize MediaClient only in browser
  useEffect(() => {
    if (!mediaClient) {
      const client = getMediaClient();
      if (client) setMediaClient(client);
    }
  }, [mediaClient]);

  // Connect media when both socket and mediaClient are ready
  useEffect(() => {
    if (!socket || !mediaClient) return;

    const setupMedia = async () => {
      try {
        await mediaClient.initialize(socket);
        const transport = await mediaClient.joinMediaGroup(socket);
        if (!transport) {
          console.info("Transport created for solo use. Will connect with nearby players automatically.");
        }
      } catch (err: unknown) {
        console.error("Failed to initialize media", err);
      }
    };

    setupMedia();

    socket.on('newProducer', async (data: { producerId: string, producerSocketId: string, kind: string }) => {
      try {
        console.log(`Received new producer notification: ${data.kind} from ${data.producerSocketId}`);
        const consumer = await mediaClient.consumeTrack(data.producerId);
        
        if (consumer) {
          console.log(`Successfully created consumer for ${data.kind} track`);
          const stream = new MediaStream([consumer.track]);
          
          // Update streams based on the track kind
          if (consumer.kind === 'video') {
            setRemoteStreams(prev => {
              const updated = new Map(prev);
              updated.set(data.producerSocketId, stream);
              return updated;
            });
            console.log(`Added video stream for player ${data.producerSocketId}`);
          } else if (consumer.kind === 'audio') {
            // Handle audio streams separately if needed
            console.log(`Added audio stream for player ${data.producerSocketId}`);
          }
        }
      } catch (err: unknown) {
        console.error("Failed to consume track", err);
      }
    });

    socket.on('producerOutOfRange', async (data: { producerSocketId: string }) => {
      console.log(`Producer ${data.producerSocketId} is now out of range`);
      
      // Remove the stream from the remoteStreams map
      setRemoteStreams(prev => {
        const updated = new Map(prev);
        updated.delete(data.producerSocketId);
        return updated;
      });
    });

    return () => { 
      socket.off('newProducer'); 
      socket.off('producerOutOfRange');
    };
  }, [socket, mediaClient]);

  const toggleAudio = async () => {
    if (!mediaClient) return;
    try {
      const stream = await mediaClient.toggleAudio();
      setAudioEnabled(!audioEnabled);
      if (stream) setLocalStream(stream);
    } catch (err: unknown) {
      console.error("Failed to toggle audio", err);
    }
  };

  const toggleVideo = async () => {
    if (!mediaClient) return;
    try {
      const stream = await mediaClient.toggleVideo();
      setVideoEnabled(!videoEnabled);
      if (stream) setLocalStream(stream);
    } catch (err: unknown) {
      console.error("Failed to toggle video", err);
    }
  };

  // const testMicrophone = async () => {
  //   if (!localStream) return;

  //   // Create temporary audio element to test mic
  //   const audioElement = new Audio();
  //   audioElement.srcObject = localStream;

  //   // Show alert with instructions
  //   alert("You'll hear yourself for 3 seconds (may cause feedback). Speak to test.");

  //   // Play for 3 seconds then stop
  //   audioElement.play();
  //   setTimeout(() => {
  //     audioElement.pause();
  //     audioElement.srcObject = null;
  //   }, 3000);
  // };

  if (!socket) {
    return <div className="flex items-center justify-center h-screen">Connecting to server...</div>;
  }

  return (
    <div className="flex flex-col h-screen bg-neutral-900">
      <main className="flex flex-grow overflow-hidden">
        <div className="flex-1 overflow-hidden rounded-lg m-2">
          <div className="h-full flex justify-center items-center">
            <Canvas socket={socket} />
          </div>
        </div>
        <div className="w-80 overflow-hidden m-2 flex flex-col">
          <ChatBox socket={socket} mediaClient={mediaClient} />

          {/* Video chat area */}
          {(videoEnabled || remoteStreams.size > 0) && (
            <div className="mt-2 bg-[#1e2124] rounded-lg p-2 flex-shrink-0">
              <h3 className="text-white text-sm mb-2">Video Chat</h3>
              <div className="grid grid-cols-2 gap-2 max-h-[200px]">
                {videoEnabled && localStream && (
                  <div className="relative">
                    <video
                      className="w-full rounded-md object-cover"
                      ref={el => { if (el && localStream) el.srcObject = localStream }}
                      autoPlay
                      muted
                    />
                    <div className="absolute bottom-1 left-1 text-xs bg-black bg-opacity-50 text-white px-1 rounded">
                      You
                    </div>
                  </div>
                )}

                {Array.from(remoteStreams.entries()).map(([id, stream]) => (
                  <div key={id} className="relative">
                    <video
                      className="w-full rounded-md object-cover"
                      ref={el => {
                        if (el && !el.srcObject) {
                          console.log(`Setting srcObject for video from ${id}`);
                          el.srcObject = stream;
                          el.autoplay = true;
                          el.playsInline = true;
                          // Set muted initially to allow autoplay
                          el.muted = true;
                          
                          el.play().catch(e => {
                            console.log(`Playback error for ${id}:`, e);
                          });
                        }
                      }}
                      autoPlay
                      playsInline
                      muted // Start muted to ensure autoplay works
                    />
                    <div className="absolute bottom-1 left-1 text-xs bg-black bg-opacity-50 text-white px-1 rounded">
                      Player {id.slice(-4)}
                    </div>
                    {/* Unmute button */}
                    <button 
                      className="absolute top-1 right-1 bg-black bg-opacity-50 text-white p-1 rounded"
                      onClick={(e) => {
                        const video = e.currentTarget.parentElement?.querySelector('video');
                        if (video) {
                          video.muted = !video.muted;
                          e.currentTarget.innerText = video.muted ? '🔇' : '🔊';
                        }
                      }}
                    >
                      🔇
                    </button>
                  </div>
                ))}
              </div>
              {audioEnabled && localStream && (
                <AudioMeter stream={localStream} />
              )}
            </div>
          )}
        </div>
      </main>
      <AppBar
        isMuted={!audioEnabled}
        isVideoOff={!videoEnabled}
        onToggleMic={toggleAudio}
        onToggleVideo={toggleVideo}
      />
    </div>
  );
}