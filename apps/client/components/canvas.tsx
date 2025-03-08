"use client";

import { useEffect, useRef } from "react";
import { loadImage } from "@/lib/utils";
import {
  setupEventListeners,
  createDefaultKeysState,
} from "@/lib/eventListeners";

import { Player } from "@/classes/Player";
import { CollisionBlock } from "@/classes/CollisionBlock";

import collisions from "@/data/collisions";
import l_Collisions from "@/data/l_Collisions";
import l_Front_Renders from "@/data/l_Front_Renders";
import l_House_Decorations from "@/data/l_House_Decorations";
import l_Houses from "@/data/l_Houses";
import l_Landscape_Decorations from "@/data/l_Landscape_Decorations";
import l_Landscape_Decorations_2 from "@/data/l_Landscape_Decorations_2";
import l_Terrain from "@/data/l_Terrain";
import l_Trees_1 from "@/data/l_Trees_1";
import l_Trees_2 from "@/data/l_Trees_2";
import l_Trees_3 from "@/data/l_Trees_3";
import l_Trees_4 from "@/data/l_Trees_4";
import { io } from "socket.io-client";

const layersData = {
  l_Terrain,
  l_Trees_1,
  l_Trees_2,
  l_Trees_3,
  l_Trees_4,
  l_Landscape_Decorations,
  l_Landscape_Decorations_2,
  l_Houses,
  l_House_Decorations,
  l_Collisions,
};
const frontRenderLayerData = {
  l_Front_Renders,
};

const tilesets = {
  l_Terrain: { imageUrl: "/images/terrain.png", tileSize: 16 },
  l_Front_Renders: { imageUrl: "/images/decorations.png", tileSize: 16 },
  l_Trees_1: { imageUrl: "/images/decorations.png", tileSize: 16 },
  l_Trees_2: { imageUrl: "/images/decorations.png", tileSize: 16 },
  l_Trees_3: { imageUrl: "/images/decorations.png", tileSize: 16 },
  l_Trees_4: { imageUrl: "/images/decorations.png", tileSize: 16 },
  l_Landscape_Decorations: {
    imageUrl: "/images/decorations.png",
    tileSize: 16,
  },
  l_Landscape_Decorations_2: {
    imageUrl: "/images/decorations.png",
    tileSize: 16,
  },
  l_Houses: { imageUrl: "/images/decorations.png", tileSize: 16 },
  l_House_Decorations: { imageUrl: "/images/decorations.png", tileSize: 16 },
  l_Collisions: { imageUrl: "/images/characters.png", tileSize: 16 },
};

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  // Create the lastTimeRef at the component level, not inside useEffect
  const lastTimeRef = useRef<number>(performance.now());

  useEffect(() => {
    const socket = io("http://localhost:8080");
    const canvas = canvasRef.current;
    if (!canvas) return;

    const c = canvas.getContext("2d");
    if (!c) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = 1024 * dpr;
    canvas.height = 576 * dpr;

    const MAP_COLS = 28;
    const MAP_ROWS = 28;

    const MAP_WIDTH = 16 * MAP_COLS;
    const MAP_HEIGHT = 16 * MAP_ROWS;

    const MAP_SCALE = dpr + 3;

    const VIEWPORT_WIDTH = canvas.width / MAP_SCALE;
    const VIEWPORT_HEIGHT = canvas.height / MAP_SCALE;

    const VIEWPORT_CENTER_X = VIEWPORT_WIDTH / 2;
    const VIEWPORT_CENTER_Y = VIEWPORT_HEIGHT / 2;

    const MAX_SCROLL_X = MAP_WIDTH - VIEWPORT_WIDTH;
    const MAX_SCROLL_Y = MAP_HEIGHT - VIEWPORT_HEIGHT;

    const blockSize = 16;
    const collisionBlocks: CollisionBlock[] = [];

    collisions.forEach((row, y) => {
      row.forEach((symbol, x) => {
        if (symbol === 1) {
          collisionBlocks.push(
            new CollisionBlock({
              x: x * blockSize,
              y: y * blockSize,
              size: blockSize,
            })
          );
        }
      });
    });

    const renderLayer = (
      tilesData: number[][],
      tilesetImage: HTMLImageElement,
      tileSize: number,
      context: CanvasRenderingContext2D
    ) => {
      tilesData.forEach((row, y) => {
        row.forEach((symbol, x) => {
          if (symbol !== 0) {
            const srcX =
              ((symbol - 1) % (tilesetImage.width / tileSize)) * tileSize;
            const srcY =
              Math.floor((symbol - 1) / (tilesetImage.width / tileSize)) *
              tileSize;
            context.drawImage(
              tilesetImage,
              srcX,
              srcY,
              tileSize,
              tileSize,
              x * 16,
              y * 16,
              16,
              16
            );
          }
        });
      });
    };

    const renderStaticLayers = async (
      layersData: Record<string, number[][]>
    ) => {
      const offscreenCanvas = document.createElement("canvas");
      offscreenCanvas.width = canvas.width;
      offscreenCanvas.height = canvas.height;
      const offscreenContext = offscreenCanvas.getContext("2d");
      if (!offscreenContext) return;

      for (const [layerName, tilesData] of Object.entries(layersData)) {
        const layerKey = layerName as keyof typeof tilesets;
        const tilesetInfo = tilesets[layerKey];

        if (tilesetInfo) {
          try {
            const tilesetImage = (await loadImage(
              tilesetInfo.imageUrl
            )) as HTMLImageElement;
            renderLayer(
              tilesData as number[][],
              tilesetImage,
              tilesetInfo.tileSize,
              offscreenContext
            );
          } catch (error) {
            console.error(
              `Failed to load image for layer ${layerName}:`,
              error
            );
          }
        }
      }
      return offscreenCanvas;
    };

    const players: { [key: string]: Player } = {};

    // Socket connection events
    socket.on("connect", () => {
      console.log("Connected to server with ID:", socket.id);
    });

    socket.on("disconnect", () => {
      console.log("Disconnected from server");
    });

    // Handle player updates from server
    socket.on("updatePlayers", (backendPlayers) => {
      // First pass: create or update players
      for (const id in backendPlayers) {
        const backendPlayer = backendPlayers[id];

        if (!players[id]) {
          // Create new player
          console.log("Creating new player:", id);
          players[id] = new Player({
            x: backendPlayer.x,
            y: backendPlayer.y,
            size: backendPlayer.size,
          });

          // If this is the local player, set their socket
          if (id === socket.id) {
            console.log("Setting socket for local player");
            players[id].setSocket(socket);
          }
        } else if (id !== socket.id) {
          // Only update remote players from server data
          players[id].x = backendPlayer.x;
          players[id].y = backendPlayer.y;

          // Update animation state for other players
          if (backendPlayer.animationState) {
            players[id].setAnimationState(
              backendPlayer.animationState.direction,
              backendPlayer.animationState.moving
            );
          }
        }
      }

      // Second pass: remove disconnected players
      for (const id in players) {
        if (!backendPlayers[id]) {
          console.log("Removing disconnected player:", id);
          delete players[id];
        }
      }
    });

    // Create keys state
    const keys = createDefaultKeysState();

    // Initialize lastTimeRef
    lastTimeRef.current = performance.now();

    // Set up event listeners
    const cleanup = setupEventListeners(keys, lastTimeRef);
    let frontRenderLayerCanvas: HTMLCanvasElement | undefined;

    const animate = (backgroundCanvas: HTMLCanvasElement) => {
      const currentTime = performance.now();
      const deltaTime = (currentTime - lastTimeRef.current) / 1000;
      lastTimeRef.current = currentTime;

      // Reference to local player for camera following
      const localPlayer = players[socket.id!];

      // Update all players
      for (const id in players) {
        const player = players[id];

        if (!player) return;
        // Only process local player input
        if (id === socket.id) {
          player.handleInput(keys);
          player.update(keys, deltaTime, collisionBlocks);
        } else {
          // For remote players, just update animation frames
          player.updateAnimationOnly(deltaTime);
        }
      }

      // Camera positioning logic (if local player exists)
      let horizontalScrollDistance = 0;
      let verticalScrollDistance = 0;

      if (localPlayer) {
        horizontalScrollDistance = Math.min(
          Math.max(0, localPlayer.center.x - VIEWPORT_CENTER_X),
          MAX_SCROLL_X
        );
        verticalScrollDistance = Math.min(
          Math.max(0, localPlayer.center.y - VIEWPORT_CENTER_Y),
          MAX_SCROLL_Y
        );
      }

      // Rendering
      c.save();
      c.scale(MAP_SCALE, MAP_SCALE);
      c.translate(-horizontalScrollDistance, -verticalScrollDistance);
      c.clearRect(0, 0, canvas.width, canvas.height);
      c.drawImage(backgroundCanvas, 0, 0);

      // Draw all players
      for (const id in players) {
        const player = players[id];
        if (!player) return;
        player.draw(c);
      }

      if (frontRenderLayerCanvas) {
        c.drawImage(frontRenderLayerCanvas, 0, 0);
      }
      c.restore();

      requestAnimationFrame(() => animate(backgroundCanvas));
    };

    const startRendering = async () => {
      try {
        const backgroundCanvas = await renderStaticLayers(layersData);
        frontRenderLayerCanvas = await renderStaticLayers(frontRenderLayerData);
        if (!backgroundCanvas) {
          console.error("Failed to create the background canvas");
          return;
        }
        animate(backgroundCanvas);
      } catch (error) {
        console.error("Error during rendering:", error);
      }
    };

    startRendering();

    return () => {
      cleanup();
      socket.disconnect();
    };
  }, []);

  return <canvas ref={canvasRef} className="rounded-lg" />;
}
