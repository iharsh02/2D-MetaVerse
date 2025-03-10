import { Server, Socket } from "socket.io";
import { Player } from "../types/Player";

const players: Record<string, Player> = {};
const playerInputs: Record<string, { keys: { w: boolean; a: boolean; s: boolean; d: boolean }; seq: number }> = {};

export function setupPlayerHandlers(io: Server, socket: Socket) {
  console.log(`Player connected: ${socket.id}`);

  // Initialize new player
  players[socket.id] = {
    id : socket.id,
    x: 100,
    y: 100,
    size: 15,
    lastProcessedInput: 0,
    velocity: { x: 0, y: 0 },
  };

  playerInputs[socket.id] = {
    keys: { w: false, a: false, s: false, d: false },
    seq: 0,
  };

  io.emit("updatePlayers", players);

  // Handle input events
  socket.on("playerInput", (data) => {
    if (playerInputs[socket.id]) {
      playerInputs[socket.id].keys = data.keys;
      playerInputs[socket.id].seq = data.seq;
    }
  });

  socket.on("playerMovement", (data) => {
    const player = players[socket.id];
    if (player) {
      player.x = data.x;
      player.y = data.y;

      if (data.animationState) {
        player.animationState = data.animationState;
      }

      io.emit("updatePlayers", players);
    }
  });

  socket.on("disconnect", (reason) => {
    console.log(`Player disconnected: ${socket.id}, reason: ${reason}`);
    delete players[socket.id];
    delete playerInputs[socket.id];
    io.emit("updatePlayers", players);
  });
}

export { players, playerInputs };