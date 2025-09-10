import { userService } from '../services/userService.js';
import Joi from 'joi';
import { comparePassword } from '../utils/password.js';

const registerSchema = Joi.object({ email: Joi.string().email().required(), phone: Joi.string().optional(), password: Joi.string().min(6).required() });
const loginSchema = Joi.object({ email: Joi.string().email().required(), password: Joi.string().required() });

export const authController = {
  async register(req, res) {
    const { error, value } = registerSchema.validate(req.body);
    if (error) return res.apiError(error.message, 400);
    const user = await userService.register(value);
    const token = userService.generateToken(user);
    res.apiSuccess({ user: { id: user.id, email: user.email }, token }, 'Created', 201);
  },
  async login(req, res) {
    const { error, value } = loginSchema.validate(req.body);
    if (error) return res.apiError(error.message, 400);
    const user = await userService.login(value);
    if (!user) return res.apiError('Invalid credentials', 401);
    const ok = comparePassword(value.password, user.passwordHash);
    if (!ok) return res.apiError('Invalid credentials', 401);
    const token = userService.generateToken(user);
  res.apiSuccess({ token, user: { id: user.id, email: user.email } }, 'OK', 200);
  }
};
