import { prisma } from '../config/prisma.js';
import path from 'path';
import { logger } from '../utils/logger.js';
import { storage } from '../utils/storage.js';
import { updateUserSchema, updateProfileSchema } from '../validation/user.js';
import { hashPassword } from '../utils/password.js';
import { searchUsers, suggestUsers } from '../search/elasticsearch.js';


export const userController = {
  async uploadPhoto(req, res) {
    try {
      const userId = req.user?.id;
  if (!userId) return res.apiError('Unauthorized', 401);
  if (!req.file) return res.apiError('No file uploaded', 400);

    // move file from multer tmp to uploads/users/{userId}_{originalname}
    const uploadsDir = path.join('uploads', 'users');
  const dest = await storage.saveTempTo(uploadsDir, req.file.path, `${userId}_${req.file.originalname}`);
  const url = `/${dest}`;
  // delete previous photo if present
  const prev = (await prisma.user.findUnique({ where: { id: userId } })).photo;
  if (prev) await storage.deletePath(prev);
  await prisma.user.update({ where: { id: userId }, data: { photo: url } });
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true, phone: true, photo: true, firstName: true, lastName: true, fullName: true, contacts: true, address: true, roles: true, listings: { include: { images: true, category: true } }, representatives: true } });
  res.apiSuccess({ photo: url, user }, 'Uploaded', 201);
    } catch (e) {
      logger.error(e, 'Failed to upload user photo');
  res.apiError('Upload failed', 500);
    }
  }
  ,
  async updateProfile(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.apiError('Unauthorized', 401);
  const { error, value } = updateProfileSchema.validate(req.body);
      if (error) return res.apiError(error.message, 400);
  const { firstName, lastName, contacts, address, metadata, password } = value;
      const data = {};
      if (firstName !== undefined) data.firstName = firstName;
      if (lastName !== undefined) data.lastName = lastName;
      if (contacts !== undefined) data.contacts = contacts;
      if (address !== undefined) data.address = address;
      if (metadata !== undefined) data.metadata = metadata;

      if (firstName || lastName) data.fullName = `${firstName || ''}${firstName && lastName ? ' ' : ''}${lastName || ''}`.trim();
      // handle optional password change
      if (password) {
        try {
          data.passwordHash = await hashPassword(password);
        } catch (e) {
          logger.error(e, 'Failed to hash password during profile update');
          return res.apiError('Failed to update password', 500);
        }
      }
      try {
        await prisma.user.update({ where: { id: userId }, data });
      } catch (err) {
        // Graceful fallback for environments where Prisma client hasn't been regenerated yet
        if (err && err.message && err.message.includes('Unknown argument `metadata`')) {
          delete data.metadata;
          await prisma.user.update({ where: { id: userId }, data });
        } else {
          throw err;
        }
      }
      let user;
      try {
  user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true, phone: true, photo: true, firstName: true, lastName: true, fullName: true, contacts: true, address: true, roles: true, metadata: true, listings: { include: { images: true, category: true } }, representatives: true } });
      } catch (err) {
        if (err && err.message && err.message.includes('Unknown field `metadata`')) {
          user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true, phone: true, photo: true, firstName: true, lastName: true, fullName: true, contacts: true, address: true, roles: true, metadata: true, listings: { include: { images: true, category: true } }, representatives: true } });
        } else throw err;
      }
      res.apiSuccess(user, 'Updated', 200);
    } catch (e) {
      logger.error(e, 'Failed to update profile');
      res.apiError('Update failed', 500);
    }
  }
};

userController.get = async function (req, res) {
  try {
    const id = req.params.id;
  const user = await prisma.user.findUnique({ where: { id }, select: { id: true, email: true, phone: true, photo: true, firstName: true, lastName: true, fullName: true, contacts: true, address: true,metadata:true, roles: true, listings: { include: { images: true, category: true } }, representatives: true, followers: true } });
    if (!user) return res.apiError('Not found', 404);
    // If followers is stored as JSON array of ids, expand them to include fullName and photo
    let followersCount = 0;
    try {
      if (user.followers && Array.isArray(user.followers) && user.followers.length) {
        const f = await prisma.user.findMany({ where: { id: { in: user.followers } }, select: { id: true, fullName: true, photo: true } });
        user.followers = f;
        followersCount = Array.isArray(f) ? f.length : 0;
      } else if (Array.isArray(user.followers)) {
        // followers present but empty
        followersCount = user.followers.length;
      }
    } catch (e) {
      // if prisma/field not supported, ignore and return raw followers
      logger.warn({ err: e?.message }, 'Failed to expand followers list');
      if (Array.isArray(user.followers)) followersCount = user.followers.length;
    }
    // attach followersCount for convenience
    user.followersCount = followersCount;
    res.apiSuccess(user, 'OK', 200);
  } catch (e) {
    logger.error(e, 'Failed to get user');
    res.apiError('Failed', 500);
  }
};

userController.follow = async function (req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.apiError('Unauthorized', 401);
    const targetId = req.params.id;
    if (!targetId) return res.apiError('Invalid target', 400);
    if (userId === targetId) return res.apiError('Cannot follow yourself', 400);
    // Load target user
    const target = await prisma.user.findUnique({ where: { id: targetId }, select: { id: true, followers: true } });
    if (!target) return res.apiError('User not found', 404);
    let followers = target.followers || [];
    if (!Array.isArray(followers)) followers = [];
    // push if not present
    if (!followers.includes(userId)) {
      followers.push(userId);
      try {
        await prisma.user.update({ where: { id: targetId }, data: { followers } });
      } catch (err) {
        // fallback for schema mismatches
        logger.warn({ err: err?.message }, 'Failed to update followers field directly');
        return res.apiError('Failed to follow user', 500);
      }
    }
    // return updated follower list expanded
    try {
      const f = await prisma.user.findMany({ where: { id: { in: followers } }, select: { id: true, fullName: true, photo: true } });
      return res.apiSuccess({ followers: f }, 'Followed', 200);
    } catch (e) {
      return res.apiSuccess({ followers }, 'Followed', 200);
    }
  } catch (e) {
    logger.error(e, 'Failed to follow user');
    res.apiError('Failed', 500);
  }
};

userController.updateById = async function (req, res) {
  try {
    const id = req.params.id;
    const { error, value } = updateUserSchema.validate(req.body);
    if (error) return res.apiError(error.message, 400);
    try {
      await prisma.user.update({ where: { id }, data: value });
    } catch (err) {
      if (err && err.message && err.message.includes('Unknown argument `metadata`')) {
        const fallback = { ...value };
        delete fallback.metadata;
        await prisma.user.update({ where: { id }, data: fallback });
      } else {
        throw err;
      }
    }
    let user;
    try {
  user = await prisma.user.findUnique({ where: { id }, select: { id: true, email: true, phone: true, photo: true, firstName: true, lastName: true, fullName: true, contacts: true, address: true, roles: true, metadata: true, listings: { include: { images: true, category: true } }, representatives: true } });
    } catch (err) {
      if (err && err.message && err.message.includes('Unknown field `metadata`')) {
  user = await prisma.user.findUnique({ where: { id }, select: { id: true, email: true, phone: true, photo: true, firstName: true, lastName: true, fullName: true, contacts: true, address: true, roles: true, listings: { include: { images: true, category: true } }, representatives: true } });
      } else throw err;
    }
    res.apiSuccess(user, 'Updated', 200);
  } catch (e) {
    logger.error(e, 'Failed to update user by id');
    res.apiError('Failed', 500);
  }
};

userController.patchById = async function (req, res) {
  try {
    const id = req.params.id;
    const payload = req.body;
    const data = {};
    for (const k of Object.keys(payload)) data[k] = payload[k];
    try {
      await prisma.user.update({ where: { id }, data });
    } catch (err) {
      if (err && err.message && err.message.includes('Unknown argument `metadata`')) {
        delete data.metadata;
        await prisma.user.update({ where: { id }, data });
      } else {
        throw err;
      }
    }
    let user;
    try {
  user = await prisma.user.findUnique({ where: { id }, select: { id: true, email: true, phone: true, photo: true, firstName: true, lastName: true, fullName: true, contacts: true, address: true, roles: true, metadata: true, listings: { include: { images: true, category: true } }, representatives: true } });
    } catch (err) {
      if (err && err.message && err.message.includes('Unknown field `metadata`')) {
  user = await prisma.user.findUnique({ where: { id }, select: { id: true, email: true, phone: true, photo: true, firstName: true, lastName: true, fullName: true, contacts: true, address: true, roles: true, listings: { include: { images: true, category: true } }, representatives: true } });
      } else throw err;
    }
    res.apiSuccess(user, 'Patched', 200);
  } catch (e) {
    logger.error(e, 'Failed to patch user by id');
    res.apiError('Failed', 500);
  }
};

// add list method
userController.list = async function (req, res) {
  try {
    const page = parseInt(req.query.page || '1', 10);
    const perPage = parseInt(req.query.perPage || '50', 10);
    const q = (req.query.q || '').trim();
    if (q) {
      const wantAutocomplete = (req.query.autocomplete === 'true' || req.query.autocomplete === '1');
      if (wantAutocomplete) {
        try {
          const sugg = await suggestUsers(q, { size: perPage });
          // Also fetch full search hits (light) to accompany suggestions
          let hits = [];
          try {
            const sr = await searchUsers(q, { page, perPage });
            hits = sr.results;
          } catch (e) {}
          return res.apiSuccess({ autocomplete: sugg, hits }, 'OK', 200);
        } catch (e) {
          console.warn('Autocomplete failed, fallback to normal search', e.message || e);
        }
      }
      try {
        const s = await searchUsers(q, { page, perPage });
        return res.apiSuccess({ total: s.total, items: s.results }, 'OK', 200);
      } catch (e) {
        // fallback to DB if search fails
        console.warn('User search failed, falling back to DB', e.message || e);
      }
    }
    const users = await prisma.user.findMany({
      skip: (page - 1) * perPage,
      take: perPage,
      orderBy: { createdAt: 'desc' },
      include: {
        roles: true,
        listings: { include: { images: true, category: true } },
  representatives: true,
        // NotificationRecipient rows for this user, include the notification details
        notifications: { include: { notification: true } },
        auditLogs: true,
        feedbacks: true
      }
    });
    return res.apiSuccess(users, 'OK', 200);
  } catch (e) {
    logger.error(e, 'Failed to list users');
    return res.apiError('Failed to list users', 500);
  }
};
