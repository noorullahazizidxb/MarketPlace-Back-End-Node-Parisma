/**
 * Builds consistent, entity-aware HTTP response messages.
 *
 * Controllers may pass any specific message ("Signed in successfully"); generic placeholders
 * ("OK", "Created", "Not found", "Failed", ...) are replaced with "<Entity> <action>" messages
 * derived from the route's entity name, the HTTP method and the status code.
 */

const ENTITY_LABELS = {
  RepresentativeInfo: 'Representative',
  ListingFeedback: 'Feedback',
  ListingImages: 'Listing image',
  UiContext: 'UI settings',
  Auth: 'Account',
  Admin: 'Admin resource',
  Public: 'Resource',
  Search: 'Search results',
  Renew: 'Renewal',
};

const GENERIC_MESSAGES = new Set([
  '', 'ok', 'success', 'created', 'updated', 'patched', 'deleted', 'removed', 'assigned', 'done',
  'error', 'failed', 'not found', 'server error', 'internal error', 'bad request',
  'unauthorized', 'forbidden', 'request failed', 'internal server error',
]);

const SUCCESS_VERBS = { GET: 'retrieved', POST: 'created', PUT: 'updated', PATCH: 'updated', DELETE: 'deleted' };
const FAILURE_VERBS = { GET: 'load', POST: 'create', PUT: 'update', PATCH: 'update', DELETE: 'delete' };

export function entityLabel(entity) {
  if (!entity) return 'Resource';
  if (ENTITY_LABELS[entity]) return ENTITY_LABELS[entity];
  // "BlogComment" -> "Blog comment"
  const spaced = String(entity).replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export function isGenericMessage(message) {
  return typeof message !== 'string' || GENERIC_MESSAGES.has(message.trim().toLowerCase());
}

export function buildSuccessMessage({ entity, method = 'GET', statusCode = 200, message } = {}) {
  if (!isGenericMessage(message)) return message;
  const verb = statusCode === 201 ? 'created' : SUCCESS_VERBS[String(method).toUpperCase()] || 'processed';
  return `${entityLabel(entity)} ${verb} successfully`;
}

const INTERNAL_LEAK = /prisma|invalid `|ECONN|ETIMEDOUT|stack|at \w+ \(/i;

export function buildErrorMessage({ entity, method = 'GET', statusCode = 500, message } = {}) {
  const leaksInternals = statusCode >= 500 && typeof message === 'string' && INTERNAL_LEAK.test(message);
  if (!isGenericMessage(message) && !leaksInternals) return message;
  const label = entityLabel(entity);
  switch (statusCode) {
    case 400: return `Invalid ${label.toLowerCase()} data`;
    case 401: return 'Authentication required';
    case 403: return 'You do not have permission to perform this action';
    case 404: return `${label} not found`;
    case 409: return `${label} already exists`;
    case 429: return 'Too many requests, please slow down';
    default: return `Failed to ${FAILURE_VERBS[String(method).toUpperCase()] || 'process'} ${label.toLowerCase()}`;
  }
}
