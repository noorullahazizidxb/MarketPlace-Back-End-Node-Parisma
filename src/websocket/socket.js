import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { prisma } from '../config/prisma.js';
import { logger } from '../utils/logger.js';
import { corsOrigins, socketEnabled } from '../lib/runtime.js';

const noopRoom = { emit() {} };
const noopIo = {
  emit() {},
  to() { return noopRoom; },
};

let io;

export function initWebsockets(server) {
  if (!socketEnabled) {
    logger.info('Socket.IO init skipped');
    return noopIo;
  }
  io = new Server(server, {
    cors: { origin: corsOrigins() === true ? '*' : corsOrigins() },
  });

  io.use(async (socket, next) => {
    try {
      let token = socket.handshake.auth?.token || socket.handshake.query?.token || socket.handshake.headers?.authorization;
      if (!token) return next();
      if (typeof token === 'string' && token.startsWith('Bearer ')) token = token.slice(7);
      const payload = jwt.verify(token, config.tokens.secret);
      const user = await prisma.user.findUnique({ where: { id: payload.sub }, include: { roles: true } });
      if (user) {
        socket.data.user = { id: user.id, roles: user.roles.map(r => r.role) };
      }
      return next();
    } catch (e) {
      logger.warn({ err: e.message }, 'Socket auth failed');
      return next();
    }
  });

  io.on('connection', (socket) => {
    logger.info({ socketId: socket.id, user: socket.data.user }, 'Socket connected');
    const roles = socket.data.user?.roles || [];
    if (roles.includes('ADMIN')) {
      socket.join('approvals');
      logger.info({ socketId: socket.id }, 'Joined approvals room');
    }
    if (socket.data.user?.id) {
      const uid = socket.data.user.id;
      socket.join(`user:${uid}`);
      logger.info({ socketId: socket.id, userId: uid }, 'Joined user room');
    }

    socket.on('disconnect', (reason) => {
      logger.info({ socketId: socket.id, reason }, 'Socket disconnected');
    });
  });

  return io;
}

/** Disconnect all sockets and close the Socket.IO server (and its HTTP server). */
export function closeWebsockets() {
  if (!io) return Promise.resolve();
  return new Promise((resolve) => io.close(() => resolve()));
}

export function getIO() {
  return io || noopIo;
}

export function emitToApprovals(event, data) {
  if (!io) return;
  io.to('approvals').emit(event, data);
}

export function emitToUser(userId, event, data) {
  if (!io) return;
  io.to(`user:${userId}`).emit(event, data);
}
