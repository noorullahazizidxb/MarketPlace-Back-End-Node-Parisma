import { userService } from '../services/userService.js';
import { storage } from '../utils/storage.js';
import { Roles } from '../constants/enums.js';
import { createNotification } from '../notifications/dispatcher.js';
import { registerSchema, loginSchema } from '../validation/auth.js';
import { registerRepresentativeSchema } from '../validation/user.js';
import { representativeService } from '../services/representativeService.js';

export const authController = {
  // NOTE: generic /auth/register removed - use role-specific endpoints

  // explicitly register as USER (same as /register)
  async registerUser(req, res) {
  // if multipart was used, multer may place the file in req.file or req.files (upload.any())
  const payload = { ...req.body };
  if (!req.file && Array.isArray(req.files) && req.files.length > 0) req.file = req.files[0];
  if (req.file) {
    // try to move temp upload to permanent location
    try {
      const dest = await storage.saveTempTo('uploads/users', req.file.path, req.file.originalname || 'photo');
      payload.photo = `/${dest.replace(/\\/g, '/').replace(/^\/?/, '')}`;
    } catch (e) {
      // fallback: store temp path reference
      payload.photo = `/${req.file.path}`;
    }
  }
  // parse JSON fields if they were sent as strings (multipart)
  ['contacts','address','metadata','representativeInfo'].forEach(k => {
    if (typeof payload[k] === 'string') {
      try { payload[k] = JSON.parse(payload[k]); } catch (e) { /* leave as string */ }
    }
  });
  const { error, value } = registerSchema.validate(payload);
  if (error) return res.apiError(error.message, 400);
  try {
    // if payload did not include role, default to USER
    const roleToUse = payload.role !== undefined && payload.role !== null ? payload.role : Roles.USER;
    const user = await userService.register(value, roleToUse);
    const token = userService.generateToken(user);
    const full = await userService.getFullUser(user.id);
    // send welcome notification (fire-and-forget)
    try {
      await createNotification({
        title: 'Welcome to the Marketplace',
        message: `Welcome ${full.fullName || full.email || 'user'} — your account has been created successfully.`,
        channel: 'SYSTEM',
        targetType: 'USER',
        senderId: null,
        recipientUserIds: [full.id]
      });
    } catch (e) {
      // don't block registration on notification failures
    }
    return res.apiSuccess({ user: full, token }, 'Created', 201);
  } catch (err) {
    // Prisma unique constraint error
    if (err && err.code === 'P2002') return res.apiError('Email already exists', 409);
    return res.apiError(err?.message || 'Server error', 500);
  }
  },

  // register as representative (public endpoint)
  async registerRepresentative(req, res) {
  const payload = { ...req.body };
  if (!req.file && Array.isArray(req.files) && req.files.length > 0) req.file = req.files[0];
  if (req.file) {
    try {
      const dest = await storage.saveTempTo('uploads/users', req.file.path, req.file.originalname || 'photo');
      payload.photo = `/${dest.replace(/\\/g, '/').replace(/^\/?/, '')}`;
    } catch (e) {
      payload.photo = `/${req.file.path}`;
    }
  }
  ['contacts','address','metadata','representativeInfo'].forEach(k => { if (typeof payload[k] === 'string') { try { payload[k] = JSON.parse(payload[k]); } catch (e) {} } });
  // use representative-specific validation when registering a representative
  const { error, value } = registerRepresentativeSchema.validate(payload);
  if (error) return res.apiError(error.message, 400);
  try {
    const user = await userService.register(value, Roles.REPRESENTATIVE);
    // if representativeInfo was provided (object or array), persist all entries (supports multiple regions)
    try {
      const repInfo = value.representativeInfo;
      if (repInfo) {
        const list = Array.isArray(repInfo) ? repInfo : [repInfo];
        for (const item of list) {
          if (item && item.region) {
            // create representative info linked to this user; don't block registration on failure
            await representativeService.create({ region: item.region, whatsappNumber: item.whatsappNumber, active: item.active }, user.id);
          }
        }
      }
    } catch (e) {
      // ignore representative creation errors for now
    }
    const token = userService.generateToken(user);
    const full = await userService.getFullUser(user.id);
    return res.apiSuccess({ user: full, token }, 'Created', 201);
  } catch (err) {
    if (err && err.code === 'P2002') return res.apiError('Email already exists', 409);
    return res.apiError(err?.message || 'Server error', 500);
  }
  },

  // register admin - protected endpoint (only ADMIN can create another ADMIN)
  async registerAdmin(req, res) {
  const payload = { ...req.body };
  if (!req.file && Array.isArray(req.files) && req.files.length > 0) req.file = req.files[0];
  if (req.file) {
    try {
      const dest = await storage.saveTempTo('uploads/users', req.file.path, req.file.originalname || 'photo');
      payload.photo = `/${dest.replace(/\\/g, '/').replace(/^\/?/, '')}`;
    } catch (e) {
      payload.photo = `/${req.file.path}`;
    }
  }
  ['contacts','address','metadata','representativeInfo'].forEach(k => { if (typeof payload[k] === 'string') { try { payload[k] = JSON.parse(payload[k]); } catch (e) {} } });
  const { error, value } = registerSchema.validate(payload);
  if (error) return res.apiError(error.message, 400);
  try {
    const user = await userService.register(value, Roles.ADMIN);
    const token = userService.generateToken(user);
    const full = await userService.getFullUser(user.id);
    return res.apiSuccess({ user: full, token }, 'Created', 201);
  } catch (err) {
    if (err && err.code === 'P2002') return res.apiError('Email already exists', 409);
    return res.apiError(err?.message || 'Server error', 500);
  }
  },

  async login(req, res) {
    const { error, value } = loginSchema.validate(req.body);
    if (error) return res.apiError(error.message, 400);
  const user = await userService.login(value);
  if (!user) return res.apiError('Invalid credentials', 401);
  const token = userService.generateToken(user);
  const full = await userService.getFullUser(user.id);
  res.apiSuccess({ token, user: full }, 'OK', 200);
  }
  ,
  async profile(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.apiError('Unauthorized', 401);
      const full = await userService.getFullUser(userId);
      return res.apiSuccess(full, 'OK', 200);
    } catch (e) {
      return res.apiError('Failed to load profile', 500);
    }
  }
};
