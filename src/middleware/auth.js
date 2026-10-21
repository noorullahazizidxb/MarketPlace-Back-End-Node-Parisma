import { Roles } from '../constants/enums.js';
import { jwtAuth } from './jwtAuth.js';

export const attachAuth = jwtAuth;

export function requireAuth(req, res, next) {
  if (!req.user) {
    if (req.authError === 'expired') {
      res.set('WWW-Authenticate', 'Bearer error="invalid_token", error_description="token expired"');
      return res.apiError('Your session has expired, please sign in again', 401, { code: 'TOKEN_EXPIRED' });
    }
    return res.apiError('Authentication required', 401, { code: 'UNAUTHENTICATED' });
  }
  next();
}

export function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) return requireAuth(req, res, next);
    if (!req.user.roles?.includes(role)) {
      return res.apiError('You do not have permission to perform this action', 403, { code: 'FORBIDDEN' });
    }
    next();
  };
}

export const requireAdmin = requireRole(Roles.ADMIN);
