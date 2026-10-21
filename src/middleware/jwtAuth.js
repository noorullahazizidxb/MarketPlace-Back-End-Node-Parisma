import { prisma } from '../config/prisma.js';
import { tokenService } from '../services/tokenServiceInstance.js';

function extractToken(req) {
  const auth = req.headers.authorization || req.headers.Authorization;
  if (auth && typeof auth === 'string') {
    const parts = auth.split(' ');
    if (parts.length === 2 && /^Bearer$/i.test(parts[0])) return parts[1];
  }
  if (req.headers['x-access-token']) return req.headers['x-access-token'];
  if (req.query && typeof req.query.token === 'string') return req.query.token;
  return null;
}

/**
 * Attaches `req.user` when a valid, unexpired access token is presented.
 * Expired tokens set `req.authError = 'expired'` so requireAuth can tell the client to refresh.
 */
export async function jwtAuth(req, res, next) {
  if (req.user) return next(); // already resolved (middleware is mounted globally and per-route)
  const token = extractToken(req);
  if (!token) return next();
  try {
    const payload = tokenService.verifyAccessToken(token);
    const user = await prisma.user.findUnique({ where: { id: payload.sub }, include: { roles: true } });
    if (user) req.user = { id: user.id, email: user.email, roles: user.roles.map((r) => r.role) };
  } catch (e) {
    req.authError = e?.name === 'TokenExpiredError' ? 'expired' : 'invalid';
  }
  return next();
}
