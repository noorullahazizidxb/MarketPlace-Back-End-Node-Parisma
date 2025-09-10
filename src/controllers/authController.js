import { userService } from '../services/userService.js';
import { storage } from '../utils/storage.js';
import { Roles } from '../constants/enums.js';
import { registerSchema, loginSchema } from '../validation/auth.js';

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
    const user = await userService.register(value, Roles.USER);
    const token = userService.generateToken(user);
    const full = await userService.getFullUser(user.id);
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
  const { error, value } = registerSchema.validate(payload);
  if (error) return res.apiError(error.message, 400);
  try {
    const user = await userService.register(value, Roles.REPRESENTATIVE);
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
};
