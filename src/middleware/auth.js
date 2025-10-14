// Simple role-based auth placeholder (replace with JWT logic)
import { Roles } from '../constants/enums.js';
import { jwtAuth } from './jwtAuth.js';

// attach jwtAuth first
export const attachAuth = jwtAuth;

export function requireAuth(req, res, next) {
  if (!req.user) return res.apiError('Unauthorized', 401);
  next();
}

export function requireRole(role) {
  return (req, res, next) => {
    if (!req.user || !req.user.roles?.includes(role)) {
      return res.apiError('Forbidden', 403);
    }
    next();
  };
}

// Convenience middleware specifically for admin-only routes
export const requireAdmin = requireRole(Roles.ADMIN);
