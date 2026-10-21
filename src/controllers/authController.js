import { userService } from '../services/userService.js';
import { storage } from '../utils/storage.js';
import { Roles } from '../constants/enums.js';
import { createNotification } from '../notifications/dispatcher.js';
import { registerSchema, loginSchema, googleSocialLoginSchema, facebookSocialLoginSchema, adminCreateUserSchema, refreshTokenSchema, logoutSchema } from '../validation/auth.js';
import { tokenService } from '../services/tokenServiceInstance.js';
import { prisma } from '../config/prisma.js';
import { registerRepresentativeSchema } from '../validation/user.js';
import { representativeService } from '../services/representativeService.js';
import { config } from '../config/index.js';
import { verifyRecaptchaToken } from '../utils/recaptcha.js';
import { publicFileUrl } from '../lib/upload.js';

const GOOGLE_CALLBACK_PATH = '/api/auth/callback/google';

function isAllowedGoogleRedirect(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.pathname !== GOOGLE_CALLBACK_PATH) return false;
  const local = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
  if (local) return url.protocol === 'http:' || url.protocol === 'https:';
  return url.protocol === 'https:' && url.hostname === 'marketplace.devminds.net';
}

async function exchangeGoogleAuthorizationCode(code, redirectUri) {
  const body = new URLSearchParams({
    code,
    client_id: config.socialAuth.googleClientId,
    client_secret: config.socialAuth.googleClientSecret,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  });
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    cache: 'no-store',
  }).then(async (response) => {
    const json = await response.json().catch(() => null);
    return response.ok ? json : null;
  });
  return tokenResponse?.id_token || null;
}

async function requireRecaptcha(req, action) {
  await verifyRecaptchaToken(req.body?.recaptchaToken, {
    secret: config.recaptcha.secretKey,
    minScore: config.recaptcha.minScore,
    expectedAction: action,
    remoteip: req.ip,
  });
}

const JSON_FIELDS = ['contacts', 'address', 'metadata', 'representativeInfo'];

/** Normalise a (possibly multipart) registration request into a plain payload. */
async function buildRegistrationPayload(req) {
  const payload = { ...req.body };
  if (!req.file && Array.isArray(req.files) && req.files.length > 0) req.file = req.files[0];
  if (req.file) {
    try {
      const dest = await storage.saveTempTo('uploads/users', req.file.path, req.file.originalname || 'photo');
      payload.photo = publicFileUrl(req.file, dest);
    } catch {
      payload.photo = `/${req.file.path}`;
    }
  }
  JSON_FIELDS.forEach((k) => {
    if (typeof payload[k] === 'string') {
      try { payload[k] = JSON.parse(payload[k]); } catch { /* leave as string */ }
    }
  });
  return payload;
}

/** Persist representative regions; never blocks account creation. */
async function persistRepresentativeInfo(userId, repInfo) {
  if (!repInfo) return;
  const list = Array.isArray(repInfo) ? repInfo : [repInfo];
  for (const item of list) {
    if (!item?.region) continue;
    try {
      await representativeService.create({ region: item.region, whatsappNumber: item.whatsappNumber, active: item.active }, userId);
    } catch { /* ignore */ }
  }
}

const requestContext = (req) => ({ userAgent: req.headers['user-agent'], ip: req.ip });

/** Issue access + refresh tokens and send the standard auth envelope. */
async function respondWithSession(req, res, user, { message, statusCode = 200, fullUser } = {}) {
  const session = await tokenService.issueSession(user, requestContext(req));
  const full = fullUser || (await userService.getFullUser(user.id));
  return res.apiSuccess({ ...session, user: full }, message, statusCode);
}

function handleRegistrationError(res, err) {
  if (err && err.code === 'P2002') return res.apiError('A user with this email already exists', 409);
  return res.apiError(err?.message || 'Failed to create user', err?.statusCode || 500);
}

function slimUser(user) {
  if (!user) return null;
  return { id: user.id, email: user.email, fullName: user.fullName, photo: user.photo, roles: user.roles };
}

export const authController = {
  // NOTE: generic /auth/register removed - use role-specific endpoints

  async registerUser(req, res) {
    try {
      await requireRecaptcha(req, 'register');
    } catch (e) {
      return res.apiError(e.message || 'reCAPTCHA failed', e.status || 400);
    }
    const payload = await buildRegistrationPayload(req);
    const { error, value } = registerSchema.validate(payload);
    if (error) return res.apiError(error.message, 400);
    try {
      // Public self-registration always creates a USER; a client-supplied role is ignored (privilege escalation).
      const user = await userService.register(value, Roles.USER);
      try {
        await createNotification({
          title: 'Welcome to the Marketplace',
          message: `Welcome ${user.fullName || user.email || 'user'} — your account has been created successfully.`,
          channel: 'SYSTEM',
          targetType: 'USER',
          senderId: null,
          recipientUserIds: [user.id]
        });
      } catch { /* don't block registration on notification failures */ }
      return respondWithSession(req, res, user, { message: 'Account created successfully', statusCode: 201 });
    } catch (err) {
      return handleRegistrationError(res, err);
    }
  },

  async registerRepresentative(req, res) {
    try {
      await requireRecaptcha(req, 'register');
    } catch (e) {
      return res.apiError(e.message || 'reCAPTCHA failed', e.status || 400);
    }
    const payload = await buildRegistrationPayload(req);
    const { error, value } = registerRepresentativeSchema.validate(payload);
    if (error) return res.apiError(error.message, 400);
    try {
      const user = await userService.register(value, Roles.REPRESENTATIVE);
      await persistRepresentativeInfo(user.id, value.representativeInfo);
      return respondWithSession(req, res, user, { message: 'Representative account created successfully', statusCode: 201 });
    } catch (err) {
      return handleRegistrationError(res, err);
    }
  },

  // Admin-only: create an account with any role. No session is issued for the new account.
  async registerAdmin(req, res) {
    const payload = await buildRegistrationPayload(req);
    if (payload.role === undefined || payload.role === '') payload.role = Roles.ADMIN; // backward compatible default
    const { error, value } = adminCreateUserSchema.validate(payload);
    if (error) return res.apiError(error.message, 400);
    try {
      const { role, representativeInfo, confirmPassword: _c, recaptchaToken: _r, ...data } = value;
      const user = await userService.register(data, role);
      if (role === Roles.REPRESENTATIVE) await persistRepresentativeInfo(user.id, representativeInfo);
      const full = await userService.getFullUser(user.id);
      return res.apiSuccess({ user: full }, 'User created successfully', 201);
    } catch (err) {
      return handleRegistrationError(res, err);
    }
  },

  async login(req, res) {
    try {
      await requireRecaptcha(req, 'login');
    } catch (e) {
      return res.apiError(e.message || 'reCAPTCHA failed', e.status || 400);
    }
    const { error, value } = loginSchema.validate(req.body);
    if (error) return res.apiError(error.message, 400);
    const { recaptchaToken: _token, ...credentials } = value;
    const user = await userService.login(credentials);
    if (!user) return res.apiError('Invalid email or password', 401);
    return respondWithSession(req, res, user, { message: 'Signed in successfully', fullUser: user });
  },

  // Exchange a refresh token for a new access token + rotated refresh token.
  async refresh(req, res) {
    const { error, value } = refreshTokenSchema.validate(req.body || {});
    if (error) return res.apiError('Refresh token is required', 400);
    try {
      const { user, session } = await tokenService.rotate(
        value.refreshToken,
        (id) => prisma.user.findUnique({ where: { id }, include: { roles: true } }),
        requestContext(req),
      );
      return res.apiSuccess({ ...session, user: slimUser(user) }, 'Session refreshed successfully', 200);
    } catch (err) {
      return res.apiError(err?.message || 'Invalid refresh token', err?.statusCode || 401);
    }
  },

  // Revoke the refresh-token family. Always succeeds so clients can finish signing out.
  async logout(req, res) {
    const { value } = logoutSchema.validate(req.body || {});
    try {
      if (value?.refreshToken) await tokenService.revoke(value.refreshToken);
      if (req.query?.all === 'true' && req.user?.id) await tokenService.revokeAllForUser(req.user.id);
    } catch { /* best effort */ }
    return res.apiSuccess(null, 'Signed out successfully', 200);
  },

  async googleSocialLogin(req, res) {
    const { error, value } = googleSocialLoginSchema.validate(req.body);
    if (error) return res.apiError(error.message, 400);
    if (!config.socialAuth.googleClientId) return res.apiError('Google auth is not configured', 503);

    try {
      let idToken = value.idToken;
      if (!idToken) {
        if (!config.socialAuth.googleClientSecret) return res.apiError('Google auth is not configured', 503);
        if (!value.redirectUri || !isAllowedGoogleRedirect(value.redirectUri)) {
          return res.apiError('Invalid Google redirect', 400);
        }
        idToken = await exchangeGoogleAuthorizationCode(value.code, value.redirectUri);
      }
      if (!idToken) return res.apiError('Invalid Google token', 401);

      const verifyUrl = new URL('https://oauth2.googleapis.com/tokeninfo');
      verifyUrl.searchParams.set('id_token', idToken);
      const tokenInfo = await fetch(verifyUrl, { cache: 'no-store' }).then(async (response) => {
        const json = await response.json().catch(() => null);
        return response.ok ? json : null;
      });

      if (!tokenInfo || tokenInfo.aud !== config.socialAuth.googleClientId) {
        return res.apiError('Invalid Google token', 401);
      }

      const user = await userService.loginWithSocialProfile({
        provider: 'google',
        providerAccountId: tokenInfo.sub,
        email: tokenInfo.email,
        firstName: tokenInfo.given_name,
        lastName: tokenInfo.family_name,
        fullName: tokenInfo.name,
        photo: tokenInfo.picture,
      });

      if (!user) return res.apiError('Unable to authenticate Google user', 401);

      return respondWithSession(req, res, user, { message: 'Signed in successfully', fullUser: user });
    } catch (err) {
      return res.apiError(err?.message || 'Google sign-in failed', 500);
    }
  },
  async facebookSocialLogin(req, res) {
    const { error, value } = facebookSocialLoginSchema.validate(req.body);
    if (error) return res.apiError(error.message, 400);
    if (!config.socialAuth.facebookAppId || !config.socialAuth.facebookAppSecret) {
      return res.apiError('Facebook auth is not configured', 503);
    }

    try {
      const debugUrl = new URL('https://graph.facebook.com/debug_token');
      debugUrl.searchParams.set('input_token', value.accessToken);
      debugUrl.searchParams.set('access_token', `${config.socialAuth.facebookAppId}|${config.socialAuth.facebookAppSecret}`);

      const debugData = await fetch(debugUrl, { cache: 'no-store' }).then(async (response) => {
        const json = await response.json().catch(() => null);
        return response.ok ? json?.data : null;
      });

      if (!debugData?.is_valid || debugData.app_id !== config.socialAuth.facebookAppId) {
        return res.apiError('Invalid Facebook token', 401);
      }

      const profileUrl = new URL('https://graph.facebook.com/me');
      profileUrl.searchParams.set('fields', 'id,name,first_name,last_name,email,picture');
      profileUrl.searchParams.set('access_token', value.accessToken);
      const profile = await fetch(profileUrl, { cache: 'no-store' }).then(async (response) => {
        const json = await response.json().catch(() => null);
        return response.ok ? json : null;
      });

      if (!profile?.email) {
        return res.apiError('Facebook account did not return an email address', 400);
      }

      const user = await userService.loginWithSocialProfile({
        provider: 'facebook',
        providerAccountId: profile.id,
        email: profile.email,
        firstName: profile.first_name,
        lastName: profile.last_name,
        fullName: profile.name,
        photo: profile.picture?.data?.url,
      });

      if (!user) return res.apiError('Unable to authenticate Facebook user', 401);

      return respondWithSession(req, res, user, { message: 'Signed in successfully', fullUser: user });
    } catch (err) {
      return res.apiError(err?.message || 'Facebook sign-in failed', 500);
    }
  },
  async profile(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.apiError('Unauthorized', 401);
      const full = await userService.getFullUser(userId);
      return res.apiSuccess(full, 'Profile retrieved successfully', 200);
    } catch (e) {
      return res.apiError('Failed to load profile', 500);
    }
  }
};
