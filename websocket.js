const WebSocket = require('ws');

// Create WebSocket server
const wss = new WebSocket.Server({ port: 8080 });

// RoomId -> Set of WebSocket connections
const rooms = new Map();

wss.on('connection', (socket, req) => {
  // Get roomId from query param
  const url = new URL(req.url, 'http://localhost');
  const roomId = url.searchParams.get('room') || 'lobby';

  // Create room if not exists
  if (!rooms.has(roomId)) {
    rooms.set(roomId, new Set());
  }

  // Add client to room
  rooms.get(roomId).add(socket);

  console.log(`Client joined room: ${roomId}`);

  socket.on('message', (data) => {
    console.log(`Message in ${roomId}: ${data}`);

    // Broadcast message to other users in same room
    for (const client of rooms.get(roomId)) {
      if (
        client !== socket &&
        client.readyState === WebSocket.OPEN
      ) {
        client.send(data.toString());
      }
    }
  });

  socket.on('close', () => {
    rooms.get(roomId).delete(socket);

    if (rooms.get(roomId).size === 0) {
      rooms.delete(roomId);
    }

    console.log(`Client left room: ${roomId}`);
  });
});

console.log('WebSocket server running on ws://localhost:8080');