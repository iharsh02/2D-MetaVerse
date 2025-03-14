import * as mediasoupModule from 'mediasoup';
const mediasoup = mediasoupModule;
import { players } from './handlers/playerHandlers';
import { MEDIASOUP_PROXIMITY_THRESHOLD , MEDIASOUP_WORKERS } from './config/serverConfig';

// Define missing constants
const MEDIA_WORKERS = MEDIASOUP_WORKERS;
const MEDIA_PROXIMITY_THRESHOLD = MEDIASOUP_PROXIMITY_THRESHOLD;

// Define Player interface
interface Player {
  x: number;
  y: number;
}

// Update the MediaGroup interface to include recvTransports and consumers
interface MediaGroup {
  router: mediasoupModule.types.Router;
  transports: Map<string, mediasoupModule.types.WebRtcTransport>;
  recvTransports: Map<string, mediasoupModule.types.WebRtcTransport>;
  producers?: Map<string, Map<string, mediasoupModule.types.Producer>>;
  consumers?: Map<string, Map<string, mediasoupModule.types.Consumer>>;
}

const workers: mediasoupModule.types.Worker[] = [];
export const mediaGroups = new Map<string, MediaGroup>();

export async function initMediaSoup() {
  try {
    console.log("MediaSoup version:", mediasoup.version);
    for (let i = 0; i < MEDIA_WORKERS; i++) {
      const worker = await mediasoup.createWorker({
        logLevel: 'warn',
        logTags: ['info', 'ice', 'dtls', 'rtp', 'srtp', 'rtcp'],
        rtcMinPort: 10000,
        rtcMaxPort: 10100
      });
      workers.push(worker);
      console.log(`Created MediaSoup worker ${i+1}/${MEDIA_WORKERS}`);
    }
  } catch (error) {
    console.error("Failed to create MediaSoup workers:", error);
    throw error;
  }
}

// Add this function to check if workers are initialized
export function hasInitializedWorkers(): boolean {
  return workers.length > 0;
}

export async function getMediaGroup(playerId: string): Promise<MediaGroup | null> {
  if (!playerId) return null;
  
  // Check if workers are initialized
  if (workers.length === 0) {
    console.error("No MediaSoup workers initialized. Call initMediaSoup() first.");
    await initMediaSoup(); // Auto-initialize on first usage
  }
  
  // Create a dedicated Router for each player to ensure capabilities work
  const playerKey = `solo-${playerId}`;
  const existingSoloGroup = mediaGroups.get(playerKey);
  if (existingSoloGroup) return existingSoloGroup;
  
  // Create a solo group for this player
  try {
    const soloGroup = await createMediaGroup(playerKey);
    return soloGroup;
  } catch (error) {
    console.error("Error creating solo media group:", error);
    return null;
  }
}

// New function to get or create a shared media group when players are nearby
export async function getSharedMediaGroup(player1Id: string, player2Id: string): Promise<MediaGroup | null> {
  if (!player1Id || !player2Id) return null;
  
  const player1 = players[player1Id];
  const player2 = players[player2Id];
  
  if (!player1 || !player2 || !arePlayersInMediaRange(player1, player2)) {
    return null;
  }
  
  // Create a key for this player pair
  const groupKey = [player1Id, player2Id].sort().join('-');
  const existingGroup = mediaGroups.get(groupKey);
  if (existingGroup) return existingGroup;
  
  try {
    return await createMediaGroup(groupKey);
  } catch (error) {
    console.error("Error creating shared media group:", error);
    return null;
  }
}

export function arePlayersInMediaRange(p1: Player, p2: Player): boolean {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return (dx*dx + dy*dy) <= MEDIA_PROXIMITY_THRESHOLD**2;
}

async function createMediaGroup(groupId: string): Promise<MediaGroup> {
  const worker = workers[Math.floor(Math.random() * workers.length)];
  const router = await worker.createRouter({
    mediaCodecs: [{
      kind: 'video',
      mimeType: 'video/VP8',
      clockRate: 90000,
      parameters: {'x-google-start-bitrate': 1000}
    }, {
      kind: 'audio',
      mimeType: 'audio/opus',
      clockRate: 48000,
      channels: 2
    }]
  });

  const group: MediaGroup = {
    router,
    transports: new Map(),
    recvTransports: new Map(),
    producers: new Map(),
    consumers: new Map()
  };
  
  mediaGroups.set(groupId, group);
  return group;
}