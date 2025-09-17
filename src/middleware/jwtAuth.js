import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { prisma } from '../config/prisma.js';

export async function jwtAuth(req, res, next) {
  // Try to extract token from multiple locations to support various clients
  let token = null;
  const auth = req.headers.authorization || req.headers.Authorization;
  if (auth && typeof auth === 'string') {
    const parts = auth.split(' ');
    if (parts.length === 2 && /^Bearer$/i.test(parts[0])) token = parts[1];
  }
  if (!token && req.headers['x-access-token']) token = req.headers['x-access-token'];
  if (!token && req.query && typeof req.query.token === 'string') token = req.query.token;
  if (!token) return next();
  try {
    const payload = jwt.verify(token, config.tokens.secret);
    // attach user minimal info including roles
    const user = await prisma.user.findUnique({ where: { id: payload.sub }, include: { roles: true } });
    if (user) req.user = { id: user.id, email: user.email, roles: user.roles.map(r => r.role) };
  } catch (e) {
    // invalid token - ignore; requireAuth will block if needed
  }
  return next();
}

