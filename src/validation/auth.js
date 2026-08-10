import Joi from 'joi';
import { createUserSchema } from './user.js';

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
  idToken: Joi.string().required(),
});

export const facebookSocialLoginSchema = Joi.object({
  accessToken: Joi.string().required(),
});
