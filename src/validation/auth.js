import Joi from 'joi';
import { createUserSchema, representativeInfoItem } from './user.js';
import { Roles } from '../constants/enums.js';

export const registerSchema = createUserSchema.keys({
  password: Joi.string().min(6).required(),
  recaptchaToken: Joi.string().allow('', null).optional(),
});
export const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
  recaptchaToken: Joi.string().allow('', null).optional(),
});
export const googleSocialLoginSchema = Joi.object({
  idToken: Joi.string().optional(),
  code: Joi.string().optional(),
  redirectUri: Joi.string().uri().optional(),
}).or('idToken', 'code');

export const facebookSocialLoginSchema = Joi.object({
  accessToken: Joi.string().required(),
});

// Admin-created accounts: any role, no reCAPTCHA (route is ADMIN-only).
export const adminCreateUserSchema = registerSchema.keys({
  role: Joi.string().valid(...Object.values(Roles)).default(Roles.USER),
  confirmPassword: Joi.any().valid(Joi.ref('password')).optional().messages({ 'any.only': 'confirmPassword must match password' }),
  representativeInfo: Joi.alternatives().try(representativeInfoItem, Joi.array().items(representativeInfoItem)).optional(),
});

export const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().min(20).max(200).required(),
});

export const logoutSchema = Joi.object({
  refreshToken: Joi.string().max(200).allow('', null).optional(),
});
