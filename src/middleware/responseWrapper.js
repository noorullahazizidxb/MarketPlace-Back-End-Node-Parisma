import { buildErrorMessage, buildSuccessMessage } from '../http/responseMessages.js';
import { AppError } from '../utils/AppError.js';
import { logger } from '../utils/logger.js';

/**
 * Response middleware: every JSON response uses one envelope
 *   { success, statusCode, message, entity, data | error }
 * with an entity-specific, human readable `message` (see http/responseMessages.js).
 */
export function responseWrapper(req, res, next) {
  const entity = () => res.locals?.entityName ?? null;

  res.apiSuccess = function (data = null, message, statusCode = 200) {
    const text = buildSuccessMessage({ entity: entity(), method: req.method, statusCode, message });
    res.status(statusCode).json({ message: text, statusCode, success: true, entity: entity(), data });
  };

  res.apiError = function (error = 'Error', statusCode = 400, details = null) {
    const raw = typeof error === 'string' ? error : error?.message;
    const text = buildErrorMessage({ entity: entity(), method: req.method, statusCode, message: raw });
    // never leak stack traces / raw Error objects to clients
    const errorBody = details ?? (typeof error === 'string' ? text : { message: text });
    res.status(statusCode).json({ message: text, statusCode, success: false, entity: entity(), error: errorBody });
  };

  next();
}

/** Route helper: tag all responses of a router with an entity name (DRY replacement for inline closures). */
export const forEntity = (entityName) => (req, res, next) => {
  res.locals.entityName = entityName;
  next();
};

/** Final error handler: maps AppError subclasses / Prisma errors to the consistent envelope. */
export function errorHandler(err, req, res, _next) {
  let status = err instanceof AppError ? err.statusCode : err?.statusCode || err?.status || 500;
  let message = err?.message;
  if (err?.code === 'P2025') { status = 404; message = null; }
  if (err?.code === 'P2002') { status = 409; message = null; }
  if (status >= 500) {
    logger.error(err, 'Unhandled error');
    message = null; // generic, entity-aware message instead of internals
  }
  if (res.apiError) return res.apiError(message, status, err?.details ?? null);
  return res.status(status).json({ success: false, statusCode: status, message: message || 'Internal error' });
}
