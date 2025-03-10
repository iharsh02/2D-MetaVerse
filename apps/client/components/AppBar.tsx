'use client';

import { useState } from 'react'
import { Bell, Calendar, MessageSquare, Mic, MicOff, Monitor, MoreHorizontal, Users, Video, VideoOff, Wand2 } from 'lucide-react'
import { cn } from '@workspace/ui/lib/utils';

const Logo = () => (
  <div className="flex items-center space-x-2">
    <div className="w-8 h-8 bg-blue-500 rounded-lg"></div>
    <span className="text-white font-semibold">Spooky Wooky</span>
  </div>
)

// const UserStatus = ({ name, status }: { name: string; status: string }) => (
//   <div className="flex items-center space-x-2">
//     <div className="relative">
//       <img src="/user.png" alt={name} className="w-8 h-8 rounded-full" />
//       <div className={cn(
//         "absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-gray-800",
//         status === 'available' ? 'bg-green-500' : 'bg-gray-500'
//       )}></div>
//     </div>
//     <div className="hidden md:block">
//       <p className="ttext-sm font-medium text-white">{name}</p>
//       <p className="text-xs text-gray-400">{status}</p>
//     </div>
//   </div>
// )

const ActionButton = ({ icon: Icon, active = false, onClick }: { icon: React.ElementType; active?: boolean; onClick?: () => void }) => (
  <button
    onClick={onClick}
    className={cn(
      "p-2 rounded-lg transition-colors",
      active ? "bg-red-500 text-white" : "text-gray-400 hover:bg-gray-700"
    )}
  >
    <Icon className="w-5 h-5" />
  </button>
)

const FeatureButton = ({ icon: Icon, badge }: { icon: React.ElementType; badge?: number }) => (
  <button className="relative p-2 text-gray-400 hover:text-white transition-colors">
    <Icon className="w-5 h-5" />
    {badge && (
      <span className="absolute top-0 right-0 w-4 h-4 bg-blue-500 rounded-full text-xs flex items-center justify-center text-white">
        {badge}
      </span>
    )}
  </button>
)

export default function AppBar() {
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoOff, setIsVideoOff] = useState(false)

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-[#1e2124] text-white">
      <div className="flex items-center space-x-4">
        <Logo />
      </div>
      <div className="flex items-center space-x-2">
        <ActionButton icon={isMuted ? MicOff : Mic} active={isMuted} onClick={() => setIsMuted(!isMuted)} />
        <ActionButton icon={isVideoOff ? VideoOff : Video} active={isVideoOff} onClick={() => setIsVideoOff(!isVideoOff)} />
        <ActionButton icon={Monitor} />
        <button className="p-1 rounded-lg bg-gray-700 text-gray-400 hover:text-white transition-colors">
          <MoreHorizontal className="w-5 h-5" />
        </button>
      </div>
      <div className="flex items-center space-x-2">
        <FeatureButton icon={Bell} />
        <FeatureButton icon={Wand2} />
        <FeatureButton icon={Calendar} />
        <FeatureButton icon={MessageSquare} badge={1} />
        <div className="flex items-center space-x-1 bg-gray-700 rounded-full px-3 py-1">
          <Users className="w-4 h-4" />
          <span className="text-sm">+1</span>
        </div>
      </div>
    </div>
  )
}
