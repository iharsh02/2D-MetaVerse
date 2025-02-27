import { Server } from "socket.io";
import http from "http";
import cors from "cors";
import express from "express";

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

const players: Record<string, { x: number; y: number; color: string }> = {};

io.on("connection", (socket) => {
  console.log(`Client connected: ${socket.id}`);

  // Assign a random color and spawn position
  players[socket.id] = {
    x: Math.random() * 500,
    y: Math.random() * 500,
    color: `hsl(${Math.random() * 360}, 100%, 50%)`,
  };

  io.emit("updatePlayers", players);

  socket.on("movePlayer", (direction) => {
    const speed = 10;
    const player = players[socket.id];

    if (!player) return;

    if (direction === "w") player.y -= speed;
    if (direction === "s") player.y += speed;
    if (direction === "a") player.x -= speed;
    if (direction === "d") player.x += speed;

    io.emit("updatePlayers", players);
  });

  socket.on("disconnect", () => {
    delete players[socket.id];
    io.emit("updatePlayers", players);
    console.log(`Client disconnected: ${socket.id}`);
  });
});

server.listen(8080, () => {
  console.log("Socket.IO server running on http://localhost:8080");
});
