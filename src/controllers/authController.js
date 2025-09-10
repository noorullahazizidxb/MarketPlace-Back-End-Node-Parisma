import { userService } from '../services/userService.js';
import Joi from 'joi';
import { Roles } from '../constants/enums.js';

const contactSchema = Joi.object({ phone: Joi.string().optional(), whatsapp: Joi.string().optional(), email: Joi.string().email().optional() }).optional();
const addressSchema = Joi.object({ street: Joi.string().optional(), city: Joi.string().optional(), country: Joi.string().optional() }).optional();

const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  phone: Joi.string().optional(),
  password: Joi.string().min(6).required(),
  firstName: Joi.string().max(100).optional(),
  lastName: Joi.string().max(100).optional(),
  contacts: contactSchema,
  address: addressSchema
});
const loginSchema = Joi.object({ email: Joi.string().email().required(), password: Joi.string().required() });

export const authController = {
  // NOTE: generic /auth/register removed - use role-specific endpoints

  // explicitly register as USER (same as /register)
  async registerUser(req, res) {
  const { error, value } = registerSchema.validate(req.body);
  if (error) return res.apiError(error.message, 400);
  const user = await userService.register(value, Roles.USER);
  const token = userService.generateToken(user);
  const full = await userService.getFullUser(user.id);
  res.apiSuccess({ user: full, token }, 'Created', 201);
  },

  // register as representative (public endpoint)
  async registerRepresentative(req, res) {
    const { error, value } = registerSchema.validate(req.body);
    if (error) return res.apiError(error.message, 400);
    const user = await userService.register(value, Roles.REPRESENTATIVE);
    const token = userService.generateToken(user);
  const full = await userService.getFullUser(user.id);
  res.apiSuccess({ user: full, token }, 'Created', 201);
  },

  // register admin - protected endpoint (only ADMIN can create another ADMIN)
  async registerAdmin(req, res) {
    const { error, value } = registerSchema.validate(req.body);
    if (error) return res.apiError(error.message, 400);
    const user = await userService.register(value, Roles.ADMIN);
    const token = userService.generateToken(user);
  const full = await userService.getFullUser(user.id);
  res.apiSuccess({ user: full, token }, 'Created', 201);
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
