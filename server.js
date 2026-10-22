const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { ExpressPeerServer } = require('peer');

const app = express();
const server = http.createServer(app);

// Cross-Origin Resource Sharing (CORS) setup
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// PeerJS setup for WebRTC audio/video routing
const peerServer = ExpressPeerServer(server, {
  debug: true,
  path: '/'
});
app.use('/peerjs', peerServer);

// Health check ping for Render
app.get('/', (req, res) => {
  res.send('Classroom Signaling Server is active and running.');
});

// Real-time Socket Events
io.on('connection', (socket) => {
  // Device room joining
  socket.on('join-room', (roomId, role) => {
    socket.join(roomId);
    socket.roomId = roomId;
    socket.role = role;
    console.log(`Socket ${socket.id} joined room ${roomId} as ${role}`);
  });

  // Whiteboard drawing synchronization (Tablet -> Student)
  socket.on('draw-stroke', (data) => {
    socket.to(data.roomId).emit('render-stroke', data);
  });

  // Board clear trigger
  socket.on('clear-board', (roomId) => {
    socket.to(roomId).emit('board-cleared');
  });

  // Real-time Chat
  socket.on('send-message', (data) => {
    io.to(data.roomId).emit('new-message', data);
  });

  // Poll trigger from Phone
  socket.on('send-poll', (data) => {
    socket.to(data.roomId).emit('receive-poll', data);
  });

  socket.on('disconnect', () => {
    console.log('Device disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
