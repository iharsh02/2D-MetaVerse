'use client';

import React from "react";
import { useState, useEffect } from 'react'
import { Smile, X } from 'lucide-react'
import { Avatar, AvatarImage, AvatarFallback } from '@workspace/ui/components/avatar';
import { Button } from '@workspace/ui/components/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@workspace/ui/components/card';
import { Input } from '@workspace/ui/components/input';
import { Socket } from "socket.io-client";
import { MediaClient } from '../lib/mediaClient';

interface ChatMessage {
  id: string;
  senderId: string;
  content: string;
  timestamp: number;
}

interface ChatBoxProps {
  socket: Socket;
  mediaClient: MediaClient;
}

const ChatBox: React.FC<ChatBoxProps> = ({ socket, mediaClient }) => {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [nearbyPlayers, setNearbyPlayers] = useState<string[]>([]);

  useEffect(() => {
    if (!socket) return;

    // Handle incoming messages
    socket.on("proximityMessage", (message: ChatMessage) => {
      setMessages(prev => [...prev, message]);
    });

    // Handle nearby players updates
    socket.on("nearbyPlayers", (players: string[]) => {
      setNearbyPlayers(players);
    });

    // Request initial nearby players
    socket.emit("requestNearbyPlayers");

    return () => {
      socket.off("proximityMessage");
      socket.off("nearbyPlayers");
    };
  }, [socket]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!socket || !message.trim()) return;

    // Send message through socket
    socket.emit("proximityMessage", message);
    setMessage('');
  };

  return (
    <Card className="w-full flex-grow bg-[#1e2124] text-white flex flex-col overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xl font-bold">Chat</CardTitle>
        <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </Button>
      </CardHeader>
      <CardContent className="flex-grow overflow-y-auto">
        <div className="space-y-4">
          <div className="flex items-center space-x-4">
            <Button variant="secondary" className="text-sm bg-[#2a2d31] hover:bg-[#3a3d41] text-white">
              Nearby ({nearbyPlayers.length})
            </Button>
          </div>
          
          {/* Nearby Players List */}
          <div className="space-y-2">
            {nearbyPlayers.map(playerId => (
              <div key={playerId} className="flex items-center space-x-4">
                <Avatar className="h-9 w-9">
                  <AvatarImage src="/user.png" alt="Avatar" />
                  <AvatarFallback>{playerId.slice(0,2)}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold">Player {playerId.slice(-4)}</span>
                  <span className="text-xs text-green-500">● Nearby</span>
                </div>
              </div>
            ))}
          </div>

          {/* Chat Messages */}
          <div className="space-y-2">
            {messages.map(msg => (
              <div 
                key={msg.id}
                className={`p-2 rounded-lg ${msg.senderId === socket?.id ? 'bg-[#2a2d31] ml-auto' : 'bg-[#36393e]'}`}
                style={{ maxWidth: '80%' }}
              >
                <div className="text-xs text-gray-400">
                  {msg.senderId === socket?.id ? 'You' : `Player ${msg.senderId.slice(-4)}`}
                </div>
                <div className="text-sm">{msg.content}</div>
                <div className="text-xs text-gray-400 text-right">
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
      <CardFooter className="mt-auto">
        <form onSubmit={handleSendMessage} className="flex w-full items-center space-x-2">
          <Input
            type="text"
            placeholder="Type a message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="flex-grow bg-[#2a2d31] border-none text-white placeholder-gray-400"
            disabled={!socket || nearbyPlayers.length === 0}
          />
          <Button 
            type="submit" 
            size="icon" 
            variant="ghost" 
            className="text-gray-400 hover:text-white"
            disabled={!socket || nearbyPlayers.length === 0}
          >
            <Smile className="h-4 w-4" />
            <span className="sr-only">Send message</span>
          </Button>
        </form>
      </CardFooter>
    </Card>
  )
}

export default ChatBox;