import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { Roles } from '../constants/enums.js';
import { logger } from '../utils/logger.js';
import { UnauthorizedError } from '../utils/AppError.js';

/**
 * Token service: short-lived JWT access tokens + opaque rotating refresh tokens.
 *
 * - Admin accounts get a 1h access token (ADMIN_ACCESS_TOKEN_TTL_SECONDS) and a 12h refresh window.
 * - Other accounts keep a longer-lived access token so regular users are not disrupted.
 * - Refresh tokens rotate on every use; re-use of a rotated token revokes the whole family
 *   (token theft detection). Sign-out revokes the presented token's family.
 *
 * Dependencies are injected so the service can be unit-tested without a database.
 */
export function createTokenService({ repository, now = () => new Date(), tokens = config.tokens, log = logger } = {}) {
  const roleNames = (user) => (user?.roles || []).map((r) => (typeof r === 'string' ? r : r.role));
  const isAdmin = (user) => roleNames(user).includes(Roles.ADMIN);
  const hash = (value) => crypto.createHash('sha256').update(value).digest('hex');
  const ttls = (user) => (isAdmin(user)
    ? { access: tokens.adminAccessTtlSeconds, refresh: tokens.adminRefreshTtlSeconds }
    : { access: tokens.userAccessTtlSeconds, refresh: tokens.userRefreshTtlSeconds });

  function signAccessToken(user) {
    const { access } = ttls(user);
    const token = jwt.sign(
      { sub: user.id, roles: roleNames(user), typ: 'access' },
      tokens.secret,
      { expiresIn: access, issuer: tokens.issuer },
    );
    return { token, expiresIn: access, expiresAt: new Date(now().getTime() + access * 1000).toISOString() };
  }

  async function createRefreshToken(user, { familyId, userAgent, ip } = {}) {
    const raw = crypto.randomBytes(48).toString('base64url');
    const { refresh } = ttls(user);
    const record = await repository.create({
      userId: user.id,
      tokenHash: hash(raw),
      familyId: familyId || crypto.randomUUID(),
      expiresAt: new Date(now().getTime() + refresh * 1000),
      userAgent: userAgent ? String(userAgent).slice(0, 190) : null,
      ip: ip ? String(ip).slice(0, 64) : null,
    });
    return { raw, record };
  }

  return {
    signAccessToken,

    verifyAccessToken(token) {
      const payload = jwt.verify(token, tokens.secret);
      // tokens issued before this change have no `typ`; they still carry an `exp` (7d) and remain valid until then
      if (payload.typ && payload.typ !== 'access') throw new UnauthorizedError('Invalid token type');
      return payload;
    },

    /** Issue an access token and (when storage is available) a refresh token for a fresh login. */
    async issueSession(user, ctx = {}) {
      const access = signAccessToken(user);
      let refreshToken = null;
      let refreshExpiresAt = null;
      try {
        const { raw, record } = await createRefreshToken(user, ctx);
        refreshToken = raw;
        refreshExpiresAt = record.expiresAt.toISOString();
      } catch (err) {
        // P2021: table missing (migration not applied yet). Degrade to access-token-only login.
        log.warn?.({ err: err?.code || err?.message }, 'Refresh token could not be persisted');
      }
      return {
        token: access.token,
        accessToken: access.token,
        expiresIn: access.expiresIn,
        expiresAt: access.expiresAt,
        refreshToken,
        refreshExpiresAt,
      };
    },

    /**
     * Rotate a refresh token. `loadUser(userId)` returns the user with roles (fresh roles on every refresh).
     * Throws UnauthorizedError on any invalid / expired / reused token.
     */
    async rotate(rawToken, loadUser, ctx = {}) {
      if (!rawToken || typeof rawToken !== 'string') throw new UnauthorizedError('Refresh token is required');
      const existing = await repository.findByHash(hash(rawToken));
      if (!existing) throw new UnauthorizedError('Invalid refresh token');
      if (existing.revokedAt) {
        // Re-use of a rotated/revoked token: assume theft, kill the whole family.
        await repository.revokeFamily(existing.familyId);
        throw new UnauthorizedError('Refresh token has been revoked');
      }
      if (existing.expiresAt.getTime() <= now().getTime()) {
        await repository.revokeById(existing.id);
        throw new UnauthorizedError('Session expired, please sign in again');
      }
      const user = await loadUser(existing.userId);
      if (!user) {
        await repository.revokeFamily(existing.familyId);
        throw new UnauthorizedError('Account no longer exists');
      }
      const { raw, record } = await createRefreshToken(user, { ...ctx, familyId: existing.familyId });
      await repository.markReplaced(existing.id, record.id);
      const access = signAccessToken(user);
      return {
        user,
        session: {
          token: access.token,
          accessToken: access.token,
          expiresIn: access.expiresIn,
          expiresAt: access.expiresAt,
          refreshToken: raw,
          refreshExpiresAt: record.expiresAt.toISOString(),
        },
      };
    },

    /** Revoke the family of the presented refresh token (sign-out). Idempotent. */
    async revoke(rawToken) {
      if (!rawToken || typeof rawToken !== 'string') return false;
      const existing = await repository.findByHash(hash(rawToken));
      if (!existing) return false;
      await repository.revokeFamily(existing.familyId);
      return true;
    },

    revokeAllForUser(userId) {
      return repository.revokeAllForUser(userId);
    },
  };
}
