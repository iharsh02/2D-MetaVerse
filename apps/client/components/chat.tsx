'use client';

import { useState } from 'react'
import { Smile, X } from 'lucide-react'
import { Avatar, AvatarImage, AvatarFallback } from '@workspace/ui/components/avatar';
import { Button } from '@workspace/ui/components/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@workspace/ui/components/card';
import { Input } from '@workspace/ui/components/input';

export default function ChatBox() {
  const [message, setMessage] = useState('')

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Sending message:', message)
    setMessage('')
  }

  return (
    <Card className="w-full h-[calc(100vh-4rem)] max-w-md mx-auto bg-[#1e2124] text-white flex flex-col">
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
              Nearby
            </Button>
          </div>
          <div className="flex items-center space-x-4">
            <Avatar className="h-9 w-9">
              <AvatarImage src="/user.png" alt="Avatar" />
              <AvatarFallback>SW</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="text-sm font-semibold">Spooky Wooky</span>
              <span className="text-xs text-green-500">● Available</span>
            </div>
          </div>
          <p className="text-sm text-gray-400 text-center">
            Start typing to send messages to others who are Nearby.
          </p>
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
          />
          <Button type="submit" size="icon" variant="ghost" className="text-gray-400 hover:text-white">
            <Smile className="h-4 w-4" />
            <span className="sr-only">Send message</span>
          </Button>
        </form>
      </CardFooter>
    </Card>
  )
}