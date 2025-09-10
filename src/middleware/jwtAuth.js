import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { prisma } from '../config/prisma.js';

export async function jwtAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return next();
  const parts = auth.split(' ');
  if (parts.length !== 2) return next();
  const token = parts[1];
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

