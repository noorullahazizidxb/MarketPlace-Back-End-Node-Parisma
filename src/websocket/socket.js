import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { prisma } from '../config/prisma.js';
import { logger } from '../utils/logger.js';

let io;

export function initWebsockets(server) {
  io = new Server(server, {
    cors: { origin: '*' }
  });

  io.use(async (socket, next) => {
    try {
      let token = socket.handshake.auth?.token || socket.handshake.query?.token || socket.handshake.headers?.authorization;
      if (!token) return next();
      // allow `Bearer <token>` format
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
    // Admins join the approvals room to receive listings for approval
    if (roles.includes('ADMIN')) {
      socket.join('approvals');
      logger.info({ socketId: socket.id }, 'Joined approvals room');
    }
    // If user is authenticated, join a personal room for notifications
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

export function getIO() {
  if (!io) throw new Error('Socket.IO not initialized');
  return io;
}

export function emitToApprovals(event, data) {
  if (!io) return;
  io.to('approvals').emit(event, data);
}

export function emitToUser(userId, event, data) {
  if (!io) return;
  io.to(`user:${userId}`).emit(event, data);
}
