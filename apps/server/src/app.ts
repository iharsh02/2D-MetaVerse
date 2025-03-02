import express from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";
import { Player } from "./types/Player";

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*", // Adjust as needed for security
    methods: ["GET", "POST"],
  },
  pingInterval: 2000,
  pingTimeout: 5000,
});

const players: { [key: string]: Player } = {};
const playerInputs: { [key: string]: { w: boolean; a: boolean; s: boolean; d: boolean } } = {};

const X_VELOCITY = 120;
const Y_VELOCITY = 120;

const UPDATE_INTERVAL = 15; 

io.on("connection", (socket) => {
  console.log(`Player connected: ${socket.id}`);
  
  // Initialize player
  players[socket.id] = {
    x: 100,
    y: 100,
    size: 15,
  };

  // Initialize input state
  playerInputs[socket.id] = {
    w: false,
    a: false,
    s: false,
    d: false
  };

  // Send current players state to new player
  io.emit("updatePlayers", players);
  
  // Handle player movement input
  socket.on("playerInput", (data) => {
    if (playerInputs[socket.id]) {
      playerInputs[socket.id] = data.keys;
    }
  });
  
  // Handle direct position and animation updates
  socket.on("playerMovement", (data) => {
    const player = players[socket.id];
    if (player) {
      player.x = data.x;
      player.y = data.y;
      
      // Update animation state
      if (data.animationState) {
        player.animationState = data.animationState;
      }
      
      // Broadcast immediately to reduce perceived latency
      io.emit("updatePlayers", players);
    }
  });

  socket.on("disconnect", (reason) => {
    console.log(`Player disconnected: ${socket.id}, reason: ${reason}`);
    delete players[socket.id];
    delete playerInputs[socket.id];
    io.emit("updatePlayers", players);
  });
});

// Since we're broadcasting on each playerMovement event, 
// we can simplify the update interval to only handle input-based movement
setInterval(() => {
  let updated = false;
  
  // Update player positions based on inputs
  for (const id in players) {
    const player = players[id];
    const input = playerInputs[id];
    
    if (input) {
      let velocityX = 0;
      let velocityY = 0;
      let direction = player.animationState?.direction || 'down';
      
      // Calculate velocity based on inputs
      if (input.d) {
        velocityX = X_VELOCITY;
        direction = 'right';
      } else if (input.a) {
        velocityX = -X_VELOCITY;
        direction = 'left';
      }
      
      if (input.w) {
        velocityY = -Y_VELOCITY;
        direction = 'up';
      } else if (input.s) {
        velocityY = Y_VELOCITY;
        direction = 'down';
      }
      
      // Apply movement
      if (velocityX !== 0 || velocityY !== 0) {
        const deltaTime = UPDATE_INTERVAL / 1000;
        player.x += velocityX * deltaTime;
        player.y += velocityY * deltaTime;
        
        // Update animation state
        player.animationState = {
          direction: direction,
          moving: true
        };
        
        updated = true;
      } else if (player.animationState?.moving) {
        // Player has stopped moving
        player.animationState.moving = false;
        updated = true;
      }
    }
  }
  
  // Only broadcast if something changed
  if (updated) {
    io.emit("updatePlayers", players);
  }
}, UPDATE_INTERVAL);

server.listen(8080, () => {
  console.log("Socket.IO server running on http://localhost:8080");
});
