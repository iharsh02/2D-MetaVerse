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
import l_Characters from "@/data/l_Characters";
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
  l_Characters,
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
  l_Characters: { imageUrl: "/images/characters.png", tileSize: 16 },
  l_Collisions: { imageUrl: "/images/characters.png", tileSize: 16 },
};

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  // Create the lastTimeRef at the component level, not inside useEffect
  const lastTimeRef = useRef<number>(performance.now());

  useEffect(() => {
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

    const renderStaticLayers = async (layersData: Record<string, number[][]>) => {
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

    const player = new Player({ x: 100, y: 100, size: 15 });

    // Create keys state using your helper function
    const keys = createDefaultKeysState();

    // Initialize lastTimeRef's current value to the current time
    lastTimeRef.current = performance.now();
    
    // Set up event listeners using your custom function
    const cleanup = setupEventListeners(keys, lastTimeRef);
    let frontRenderLayerCanvas: HTMLCanvasElement | undefined;

    const animate = (backgroundCanvas: HTMLCanvasElement) => {
      const currentTime = performance.now();
      const deltaTime = (currentTime - lastTimeRef.current) / 1000;
      lastTimeRef.current = currentTime;

      player.handleInput(keys);
      player.update(deltaTime, collisionBlocks);

      const horizontalScrollDistance = Math.min(
        Math.max(0, player.center.x - VIEWPORT_CENTER_X),
        MAX_SCROLL_X
      );
      const verticalScrollDistance = Math.min(
        Math.max(0, player.center.y - VIEWPORT_CENTER_Y),
        MAX_SCROLL_Y
      );

      c.save();
      c.scale(MAP_SCALE, MAP_SCALE);

      c.translate(-horizontalScrollDistance, -verticalScrollDistance);

      c.clearRect(0, 0, canvas.width, canvas.height);
      c.drawImage(backgroundCanvas, 0, 0);
      player.draw(c);
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

    // Return the cleanup function from your eventListener module
    return cleanup;
  }, []);

  return <canvas ref={canvasRef} />;
}
