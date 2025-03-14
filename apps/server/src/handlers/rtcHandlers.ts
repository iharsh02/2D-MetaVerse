import { Server, Socket } from 'socket.io';
import { getMediaGroup, arePlayersInMediaRange, mediaGroups } from '../mediasoup';
import { MEDIASOUP_LISTEN_IP } from '../config/serverConfig';
import { players } from './playerHandlers';

export function setupRTCHandlers(io: Server, socket: Socket) {
  socket.on('getRouterCapabilities', async (callback) => {
    const group = await getMediaGroup(socket.id);
    if (!group) return callback({ error: 'No media group available' });
    
    callback(group.router.rtpCapabilities);
  });

  socket.on('createTransport', async (callback) => {
    try {
      const group = await getMediaGroup(socket.id);
      if (!group) {
        console.error("Failed to create media group for player", socket.id);
        return callback({ 
          error: 'Server error creating media group',
          isAlone: true
        });
      }

      console.log(`Creating transport for socket ${socket.id} in group ${group ? 'exists' : 'missing'}`);
      
      // Create the transport
      const transport = await group.router.createWebRtcTransport({
        listenIps: [{ ip: MEDIASOUP_LISTEN_IP }],
        enableUdp: true,
        enableTcp: true,
        initialAvailableOutgoingBitrate: 1000000
      });
      
      // Initialize the transports Map if it doesn't exist
      if (!group.transports) {
        group.transports = new Map();
      }
      
      // Store the transport
      group.transports.set(socket.id, transport);
      console.log(`Transport ${transport.id} created and stored for socket ${socket.id}`);
      
      callback({
        id: transport.id,
        iceParameters: transport.iceParameters,
        iceCandidates: transport.iceCandidates,
        dtlsParameters: transport.dtlsParameters,
        isAlone: Object.keys(players).length <= 1
      });
    } catch (error) {
      console.error("Error creating transport:", error);
      callback({ error: 'Failed to create transport' });
    }
  });

  socket.on('connectTransport', async ({ dtlsParameters }: { dtlsParameters: any }, callback: (data: any) => void) => {
    const group = await getMediaGroup(socket.id);
    if (group?.transports.has(socket.id)) {
      const transport = group.transports.get(socket.id)!;
      await transport.connect({ dtlsParameters });
      callback({ success: true });
    }
  });

  socket.on('produce', async ({ kind, rtpParameters }, callback) => {
    try {
      // Get the solo media group for this player
      const group = await getMediaGroup(socket.id);
      if (!group || !group.transports.has(socket.id)) {
        return callback({ error: 'Transport not found' });
      }

      const transport = group.transports.get(socket.id)!;
      const producer = await transport.produce({ kind, rtpParameters });
      
      // Store the producer
      group.producers = group.producers || new Map();
      if (!group.producers.has(socket.id)) {
        group.producers.set(socket.id, new Map());
      }
      group.producers.get(socket.id)!.set(producer.id, producer);

      // Only notify nearby players
      const currentPlayer = players[socket.id];
      if (!currentPlayer) {
        return callback({ id: producer.id });
      }

      // Find nearby players and notify them
      Object.keys(players)
        .filter(id => {
          if (id === socket.id) return false;
          const otherPlayer = players[id];
          return otherPlayer && arePlayersInMediaRange(currentPlayer, otherPlayer);
        })
        .forEach(id => {
          io.to(id).emit('newProducer', {
            producerId: producer.id,
            producerSocketId: socket.id,
            kind: producer.kind
          });
        });

      callback({ id: producer.id });
    } catch (error) {
      console.error("Error in produce handler:", error);
      callback({ error: 'Internal server error' });
    }
  });

  socket.on('createRecvTransport', async (callback) => {
    try {
      const group = await getMediaGroup(socket.id);
      if (!group) {
        return callback({ error: 'No media group available' });
      }

      const transport = await group.router.createWebRtcTransport({
        listenIps: [{ ip: MEDIASOUP_LISTEN_IP }],
        enableUdp: true,
        enableTcp: true,
        initialAvailableOutgoingBitrate: 1000000
      });

      // Store this receive transport with a different key to distinguish it
      group.recvTransports = group.recvTransports || new Map();
      group.recvTransports.set(socket.id, transport);

      callback({
        id: transport.id,
        iceParameters: transport.iceParameters,
        iceCandidates: transport.iceCandidates,
        dtlsParameters: transport.dtlsParameters
      });
    } catch (error) {
      console.error("Error creating receive transport:", error);
      callback({ error: 'Internal server error' });
    }
  });

  socket.on('connectRecvTransport', async ({ dtlsParameters }: { dtlsParameters: any }, callback: (data: any) => void) => {
    try {
      const group = await getMediaGroup(socket.id);
      if (!group || !group.recvTransports?.has(socket.id)) {
        return callback({ error: 'Transport not found' });
      }
      const transport = group.recvTransports.get(socket.id)!;
      await transport.connect({ dtlsParameters });
      callback({ success: true });
    } catch (error) {
      console.error("Error connecting transport:", error);
      callback({ error: 'Internal server error' });
    }
  });

  socket.on('consume', async ({ producerId, rtpCapabilities }, callback) => {
    try {
      // Find which player owns this producer
      let ownerSocketId = null;
      let producerObj = null;
      
      // Search all media groups to find the producer
      for (const [groupId, group] of mediaGroups.entries()) {
        if (!group.producers) continue;
        
        for (const [socketId, producers] of group.producers.entries()) {
          if (producers.has(producerId)) {
            ownerSocketId = socketId;
            producerObj = producers.get(producerId);
            break;
          }
        }
        if (ownerSocketId) break;
      }
      
      if (!ownerSocketId || !producerObj) {
        return callback({ error: 'Producer not found' });
      }
      
      // Get the producer's media group instead of the consumer's
      const ownerKey = `solo-${ownerSocketId}`;
      const group = mediaGroups.get(ownerKey);
      
      if (!group) {
        return callback({ error: 'Producer group not found' });
      }
      
      // Ensure consumer transport exists in this group
      if (!group.recvTransports || !group.recvTransports.has(socket.id)) {
        // Create a receive transport for this consumer in the producer's group
        const transport = await group.router.createWebRtcTransport({
          listenIps: [{ ip: MEDIASOUP_LISTEN_IP }],
          enableUdp: true,
          enableTcp: true,
          initialAvailableOutgoingBitrate: 1000000
        });
        
        group.recvTransports = group.recvTransports || new Map();
        group.recvTransports.set(socket.id, transport);
        
        // Tell the client about this new transport before continuing
        // For this example, we'll just use the existing transport
      }
      
      const recvTransport = group.recvTransports.get(socket.id);
      
      // Add null check
      if (!recvTransport) {
        return callback({ error: 'Receive transport not found' });
      }
      
      // Check if the device can consume the producer
      if (!group.router.canConsume({
        producerId,
        rtpCapabilities
      })) {
        return callback({ error: 'Cannot consume this producer (RTP capabilities not compatible)' });
      }
      
      // Now safe to use recvTransport
      const consumer = await recvTransport.consume({
        producerId,
        rtpCapabilities,
        paused: false
      });
      
      // Immediately resume the consumer, especially important for audio
      await consumer.resume();
      
      // Store the consumer
      group.consumers = group.consumers || new Map();
      if (!group.consumers.has(socket.id)) {
        group.consumers.set(socket.id, new Map());
      }
      group.consumers.get(socket.id)!.set(consumer.id, consumer);
      
      callback({
        id: consumer.id,
        producerId: consumer.producerId,
        kind: consumer.kind,
        rtpParameters: consumer.rtpParameters
      });
    } catch (error) {
      console.error("Error consuming:", error);
      callback({ error: 'Internal server error' });
    }
  });

  // Handle consume requests via HTTP (would need an express or similar HTTP handler)
  // This would be implemented elsewhere, using something like:
  /*
  app.get('/api/consume', async (req, res) => {
    const { producerId } = req.query;
    const playerId = req.headers['x-player-id']; // You'd authenticate somehow
    
    const group = await getMediaGroup(playerId);
    if (!group) return res.status(404).send('No media group');
    
    const transport = group.transports.get(playerId);
    if (!transport) return res.status(404).send('No transport');
    
    const consumer = await transport.consume({
      producerId,
      rtpCapabilities: req.body.rtpCapabilities
    });
    
    res.json({
      id: consumer.id,
      producerId: consumer.producerId,
      kind: consumer.kind,
      rtpParameters: consumer.rtpParameters
    });
  });
  */
}

export function manageMediaConnections(io: Server) {
  // First handle disconnections (keep existing code)
  for (const [socketId, playerData] of Object.entries(players)) {
    const player = playerData;
    
    // Find all consumers for this player and check if they're still in range
    for (const [groupId, group] of mediaGroups.entries()) {
      if (!group.consumers) continue;
      
      for (const [consumerSocketId, consumers] of group.consumers.entries()) {
        // Skip if this isn't a consumer for the current player
        if (consumerSocketId !== socketId) continue;
        
        // Find the producer socket ID from the group name
        const matchProducer = groupId.match(/^solo-(.+)$/);
        if (!matchProducer) continue;
        
        const producerSocketId = matchProducer[1];
        
        // Get the producer player
        const producerPlayer = players[producerSocketId];
        if (!producerPlayer) continue;
        
        // Check if they're still in range
        const inRange = arePlayersInMediaRange(player, producerPlayer);
        
        if (!inRange) {
          // Notify the consumer that this producer is now out of range
          io.to(socketId).emit('producerOutOfRange', { producerSocketId });
          
          // Clean up the consumers
          for (const consumer of consumers.values()) {
            consumer.close();
          }
          group.consumers.delete(socketId);
        }
      }
    }
    
    // Now handle new connections - notify about existing producers
    // Check all other players to see if they're in range but not connected
    for (const [otherSocketId, otherPlayerData] of Object.entries(players)) {
      // Skip self
      if (otherSocketId === socketId) continue;
      
      const otherPlayer = otherPlayerData;
      
      // Check if players are in range
      const inRange = arePlayersInMediaRange(player, otherPlayer);
      if (!inRange) continue;
      
      // Get the other player's media group
      const otherGroupId = `solo-${otherSocketId}`;
      const otherGroup = mediaGroups.get(otherGroupId);
      if (!otherGroup || !otherGroup.producers || !otherGroup.producers.has(otherSocketId)) continue;
      
      // Get all producers from the other player
      const producers = otherGroup.producers.get(otherSocketId);
      if (!producers) continue;
      
      // Check if this player is already consuming from the other player
      const isAlreadyConnected = Array.from(mediaGroups.entries()).some(([gid, g]) => {
        if (!g.consumers || !g.consumers.has(socketId)) return false;
        return gid === otherGroupId;
      });
      
      // If not already connected, notify about all existing producers
      if (!isAlreadyConnected) {
        for (const [producerId, producer] of producers.entries()) {
          io.to(socketId).emit('newProducer', {
            producerId,
            producerSocketId: otherSocketId,
            kind: producer.kind
          });
          console.log(`Notifying ${socketId} about existing ${producer.kind} producer ${producerId} from ${otherSocketId}`);
        }
      }
    }
  }
} 