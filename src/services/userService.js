import { userRepository } from '../repositories/userRepository.js';
import { hashPassword } from '../utils/password.js';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';

export const userService = {
  async register({ email, phone, password }) {
    const passwordHash = hashPassword(password);
    const user = await userRepository.create({ email, phone, passwordHash });
    return user;
  },
  async login({ email, password }) {
    const user = await userRepository.findByEmail(email);
    if (!user) return null;
    // compare omitted here; implement compare once password util added
    return user;
  },
  generateToken(user) {
    const payload = { sub: user.id, roles: [] };
    return jwt.sign(payload, config.tokens.secret, { expiresIn: '7d' });
  }
};
