export interface ServerToClientEvents {
    message: (data: string) => void;
    playerMoved: (playerId: string, x: number, y: number) => void;
  }
  
  export interface ClientToServerEvents {
    sendMessage: (data: string) => void;
    movePlayer: (x: number, y: number) => void;
  }
  
  export interface InterServerEvents {
    syncPlayers: (players: { id: string; x: number; y: number }[]) => void;
  }
  
  export interface SocketData {
    userId?: string;
  }
export interface ServerToClientEvents {
  message: (data: string) => void;
  playerMoved: (playerId: string, x: number, y: number) => void;
}

export interface ClientToServerEvents {
  sendMessage: (data: string) => void;
  movePlayer: (x: number, y: number) => void;
}

export interface InterServerEvents {
  syncPlayers: (players: { id: string; x: number; y: number }[]) => void;
}

export interface SocketData {
  userId?: string;
}