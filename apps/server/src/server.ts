import express from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";
import { setupPlayerHandlers, players, playerInputs } from "./handlers/playerHandlers";
import { processPlayerMovement } from "./utils/movement";
import { SERVER_PORT, SOCKET_OPTIONS, UPDATE_INTERVAL } from "./config/serverConfig";

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, SOCKET_OPTIONS);

io.on("connection", (socket) => setupPlayerHandlers(io, socket));

// Game update loop
setInterval(() => {
  if (processPlayerMovement(players, playerInputs)) {
    io.emit("updatePlayers", players);
  }
}, UPDATE_INTERVAL);

server.listen(SERVER_PORT, () => {
  console.log(`Socket.IO server running on http://localhost:${SERVER_PORT}`);
});