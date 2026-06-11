// filename: backend/src/websocket/socketServer.js
import { Server as SocketIOServer } from 'socket.io';
import { config } from '../config/env.js';
import { verifyAccessToken } from '../services/authService.js';

let io = null;

export function initSocket(httpServer) {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: config.frontendUrl,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  io.on('connection', (socket) => {
    const { role, userId, token } = socket.handshake.query;

    console.log(`[Socket.io] Client connected: ${socket.id} | role=${role} | userId=${userId}`);

    if (token) {
      try {
        const payload = verifyAccessToken(token);
        socket.data.user = payload;
      } catch {
        console.warn(`[Socket.io] Invalid token from ${socket.id} — connecting without auth`);
      }
    }

    if (role === 'analyst') {
      socket.join('analysts');
      console.log(`[Socket.io] ${socket.id} joined analysts room`);
      socket.emit('connected', { room: 'analysts', message: 'Welcome, analyst.' });
    } else if (userId) {
      const customerRoom = `customer:${userId}`;
      socket.join(customerRoom);
      socket.join('customers');
      console.log(`[Socket.io] ${socket.id} joined customer room for userId=${userId}`);
      socket.emit('connected', { room: customerRoom, message: 'Connected to Cogniq.' });
    } else {
      socket.emit('connected', { room: null, message: 'Connected to Cogniq.' });
    }

    socket.on('disconnect', (reason) => {
      console.log(`[Socket.io] Client disconnected: ${socket.id} | reason=${reason}`);
    });

    socket.on('error', (err) => {
      console.error(`[Socket.io] Error on ${socket.id}:`, err.message);
    });
  });

  console.log('[Socket.io] Server initialised');
  return io;
}

export function getIO() {
  if (!io) {
    throw new Error('[Socket.io] Server has not been initialised. Call initSocket() first.');
  }
  return io;
}

/**
 * Emits a risk event to all connected analysts.
 * Accepts either (eventData) for backward compat or (eventName, eventData).
 */
export function emitRiskEvent(eventNameOrData, eventData) {
  if (!io) {
    console.warn('[Socket.io] Cannot emit risk event — socket server not initialised');
    return;
  }

  // Support both call signatures:
  // emitRiskEvent(eventData)         — used by auth.js (backwards compat)
  // emitRiskEvent('risk:new_event', eventData) — used by riskOrchestratorService.js
  if (typeof eventNameOrData === 'string' && eventData) {
    io.to('analysts').emit(eventNameOrData, {
      ...eventData,
      timestamp: eventData.timestamp || new Date().toISOString(),
    });
  } else {
    const data = eventNameOrData;
    io.to('analysts').emit('risk:new_event', {
      ...data,
      timestamp: data.timestamp || new Date().toISOString(),
    });
  }
}

export function emitAlertCreated(alertData) {
  if (!io) return;
  io.to('analysts').emit('risk:alert_created', {
    ...alertData,
    timestamp: new Date().toISOString(),
  });
}

export function emitAlertUpdated(updateData) {
  if (!io) return;
  io.to('analysts').emit('risk:alert_updated', updateData);
}

export function emitToCustomer(userId, eventData) {
  if (!io) return;
  io.to(`customer:${userId}`).emit('risk:new_event', eventData);
}
