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

// Store players by socket id
const players: { [key: string]: Player } = {};

io.on("connection", (socket) => {
  players[socket.id] = {
    x: 500 * Math.random(),
    y: 500 * Math.random(),
    size: 15,
  };

  io.emit("updatePlayers", players);
  
  socket.on("disconnect", (resaon) => {
    console.log(resaon);
    delete players[socket.id];
    io.emit("updatePlayers", players);
  });
});

server.listen(8080, () => {
  console.log("Socket.IO server running on http://localhost:8080");
});
