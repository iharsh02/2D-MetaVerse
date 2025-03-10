import { CHAT_PROXIMITY_THRESHOLD, UPDATE_INTERVAL } from "../config/serverConfig";
import { Player } from "../types/Player";

export const PROXIMITY_CONFIG = {
  // Distance threshold for proximity chat (in game units)
  CHAT_PROXIMITY_THRESHOLD: CHAT_PROXIMITY_THRESHOLD,
  
  // How often to update proximity relationships (in ms)
  UPDATE_INTERVAL: UPDATE_INTERVAL,
  
  // When true, creates transitive relationships (if A is near B and B is near C, 
  // then A, B, and C are all in the same chat group even if A is not directly near C)
  USE_TRANSITIVE_PROXIMITY: true
};


export interface ChatGroup {
  id: string;
  playerIds: string[];
  createdAt: number;
}

/**
 * Determines if two players are within chat proximity of each other
 */
export function arePlayersNearby(player1: Player, player2: Player): boolean {
  // Calculate Euclidean distance between players
  const dx = player1.x - player2.x;
  const dy = player1.y - player2.y;
  const distanceSquared = dx * dx + dy * dy;
  
  // Compare with squared threshold (avoids expensive square root)
  return distanceSquared <= PROXIMITY_CONFIG.CHAT_PROXIMITY_THRESHOLD * PROXIMITY_CONFIG.CHAT_PROXIMITY_THRESHOLD;
}

export function findChatGroups(players: Record<string, Player>): ChatGroup[] {
  const playerIds = Object.keys(players);
  const visited = new Set<string>();
  const chatGroups: ChatGroup[] = [];

  // For each player, if not already in a group, create a new group
  for (const playerId of playerIds) {
    if (visited.has(playerId)) continue;

    // Start a new chat group
    const group: string[] = [playerId];
    visited.add(playerId);

    // Only use BFS if we want transitive relationships 
    if (PROXIMITY_CONFIG.USE_TRANSITIVE_PROXIMITY) {
      const queue: string[] = [playerId];
      
      // Use breadth-first search to find all connected players
      while (queue.length > 0) {
        const currentId = queue.shift()!;
        const currentPlayer = players[currentId];
        
        // Find all unvisited players who are near the current player
        for (const otherId of playerIds) {
          if (visited.has(otherId) || otherId === currentId) continue;
          
          if (arePlayersNearby(currentPlayer, players[otherId])) {
            group.push(otherId);
            visited.add(otherId);
            queue.push(otherId);
          }
        }
      }
    } else {
      // If not using transitive relationships, just find direct neighbors
      for (const otherId of playerIds) {
        if (otherId === playerId) continue;
        
        if (arePlayersNearby(players[playerId], players[otherId])) {
          group.push(otherId);
          visited.add(otherId);
        }
      }
    }

    // Only add groups with at least 2 players (no point in a solo chat group)
    if (group.length >= 2) {
      chatGroups.push({
        id: `group_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        playerIds: group,
        createdAt: Date.now()
      });
    }
  }

  return chatGroups;
}

export function getNearbyPlayers(playerId: string, players: Record<string, Player>): string[] {
  if (!players[playerId]) return [];
  
  const nearbyPlayerIds: string[] = [];
  const currentPlayer = players[playerId];
  
  for (const id in players) {
    if (id === playerId) continue;
    
    if (arePlayersNearby(currentPlayer, players[id])) {
      nearbyPlayerIds.push(id);
    }
  }
  
  return nearbyPlayerIds;
}


export function getPlayerChatGroup(playerId: string, chatGroups: ChatGroup[]): ChatGroup | null {
  for (const group of chatGroups) {
    if (group.playerIds.includes(playerId)) {
      return group;
    }
  }
  return null;
}