import express from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";
import { setupPlayerHandlers, players, playerInputs } from "./handlers/playerHandlers";
import { setupChatHandlers, broadcastProximityUpdates } from "./handlers/chatHandlers";
import { processPlayerMovement } from "./utils/movement";
import { SERVER_PORT, SOCKET_OPTIONS, UPDATE_INTERVAL } from "./config/serverConfig";
import { PROXIMITY_CONFIG } from "./utils/proximityDetector";
import { setupRTCHandlers, manageMediaConnections } from "./handlers/rtcHandlers";
import { initMediaSoup } from "./mediasoup";

// Initialize MediaSoup before starting the server
async function startServer() {
  try {
    console.log("Initializing MediaSoup...");
    await initMediaSoup();
    
    const app = express();
    app.use(cors());
    
    const server = http.createServer(app);
    const io = new Server(server, SOCKET_OPTIONS);
    
    io.on("connection", (socket) => {
      try {
        setupPlayerHandlers(io, socket);
        setupChatHandlers(io, socket);
        setupRTCHandlers(io, socket);
      } catch (error) {
        console.error("Error handling socket connection:", error);
      }
    });
    
    // Game update loop
    setInterval(() => {
      if (processPlayerMovement(players, playerInputs)) {
        io.emit("updatePlayers", players);
        broadcastProximityUpdates(io);
        manageMediaConnections(io);
      }
    }, UPDATE_INTERVAL, PROXIMITY_CONFIG.UPDATE_INTERVAL);
    
    server.listen(SERVER_PORT, () => {
      console.log(`Socket.IO server running on http://localhost:${SERVER_PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
  }
}

startServer();