"use client";
import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import AppBar from "@/components/AppBar";
import Canvas from "@/components/canvas";
import ChatBox from "@/components/chat";

export default function Home() {
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const newSocket = io("http://localhost:8080");
    
    setSocket(newSocket);
    return () => {
      newSocket.disconnect();
    };
  }, []);

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
        <div className="w-80 overflow-hidden m-2">
          <ChatBox socket={socket} />
        </div>
      </main>
      <AppBar />
    </div>
  );
}