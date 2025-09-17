import { userRepository } from '../repositories/userRepository.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { prisma } from '../config/prisma.js';

export const userService = {
  // role: one of 'ADMIN'|'USER'|'REPRESENTATIVE'
  async register(payload, role = 'USER') {
    const { email, phone, password, firstName, lastName, contacts, address, photo } = payload;
  const passwordHash = await hashPassword(password);
    const fullName = `${firstName || ''}${firstName && lastName ? ' ' : ''}${lastName || ''}`.trim() || null;
    const createData = { email, phone, passwordHash };
    if (photo !== undefined && photo !== null) createData.photo = photo;
    if (firstName !== undefined) createData.firstName = firstName;
    if (lastName !== undefined) createData.lastName = lastName;
    if (fullName) createData.fullName = fullName;
    if (contacts !== undefined) createData.contacts = contacts;
    if (address !== undefined) createData.address = address;
    const user = await userRepository.create(createData);
    // assign role via userRole table
    await prisma.userRole.create({ data: { userId: user.id, role } });
    // reload user with roles
    const full = await prisma.user.findUnique({ where: { id: user.id }, include: { roles: true } });
    return full;
  },
  async login({ email, password }) {
    const user = await userRepository.findByEmail(email);
    if (!user) return null;
    const ok = await comparePassword(password, user.passwordHash);
    if (!ok) return null;
    // fetch full user with related data but without passwordHash
    const full = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        phone: true,
        photo: true,
        firstName: true,
        lastName: true,
        fullName: true,
        contacts: true,
        address: true,
        roles: true,
  listings: { include: { images: true, category: true, representatives: { include: { representative: true } }, renewTokens: true } },
        representative: true,
        notifications: { include: { notification: true } },
        sentNotifications: true,
        approvedListings: true,
        auditLogs: true,
        feedbacks: true
      }
    });
    return full;
  },
  async getUserRoles(userId) {
    const rows = await prisma.userRole.findMany({ where: { userId } });
    return rows.map(r => r.role);
  },
  async getFullUser(userId) {
    return prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        phone: true,
        photo: true,
        firstName: true,
        lastName: true,
        fullName: true,
        contacts: true,
        address: true,
        roles: true,
  listings: { include: { images: true, category: true, representatives: { include: { representative: true } }, renewTokens: true } },
        representative: true,
        notifications: { include: { notification: true } },
        sentNotifications: true,
        approvedListings: true,
        auditLogs: true,
        feedbacks: true
      }
    });
  },
  generateToken(user) {
    const roles = (user.roles || []).map(r => r.role);
    const payload = { sub: user.id, roles };
    return jwt.sign(payload, config.tokens.secret, { expiresIn: '7d' });
  }
};
