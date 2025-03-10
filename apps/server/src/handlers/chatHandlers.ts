import { Server, Socket } from "socket.io";
import { 
  findChatGroups, 
  getPlayerChatGroup,
  ChatGroup 
} from "../utils/proximityDetector";
import { players } from "./playerHandlers";

let currentChatGroups: ChatGroup[] = [];

interface ChatMessage {
  id: string;
  senderId: string;
  senderName?: string;
  content: string;
  timestamp: number;
}

export function setupChatHandlers(io: Server, socket: Socket) {
  socket.emit("chatGroups", currentChatGroups);
  
  socket.on("proximityMessage", (message: string) => {
    updateChatGroups();
    
    const group = getPlayerChatGroup(socket.id, currentChatGroups);
    
    if (!group) {
      socket.emit("chatEvent", { 
        type: "info", 
        message: "No one is nearby to hear you" 
      });
      return;
    }
    
    const chatMessage: ChatMessage = {
      id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
      senderId: socket.id,
      content: message,
      timestamp: Date.now()
    };
    
    group.playerIds.forEach(playerId => {
      io.to(playerId).emit("proximityMessage", chatMessage);
    });
  });
  
  socket.on("requestNearbyPlayers", () => {
    updateChatGroups();
    const group = getPlayerChatGroup(socket.id, currentChatGroups);
    
    if (group) {
      const nearbyPlayers = group.playerIds.filter(id => id !== socket.id);
      socket.emit("nearbyPlayers", nearbyPlayers);
    } else {
      socket.emit("nearbyPlayers", []);
    }
  });
}

function updateChatGroups() {
  currentChatGroups = findChatGroups(players);
  return currentChatGroups;
}

export function broadcastProximityUpdates(io: Server) {
  const newGroups = updateChatGroups();
  
  for (const id in players) {
    const group = getPlayerChatGroup(id, newGroups);
    
    if (group) {
      const nearbyPlayers = group.playerIds.filter(pid => pid !== id);
      io.to(id).emit("nearbyPlayers", nearbyPlayers);
    } else {
      io.to(id).emit("nearbyPlayers", []);
    }
  }
}