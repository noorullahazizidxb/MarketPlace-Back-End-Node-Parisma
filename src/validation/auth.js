import Joi from 'joi';
import { createUserSchema } from './user.js';

export const registerSchema = createUserSchema.keys({ password: Joi.string().min(6).required() });
export const loginSchema = Joi.object({ email: Joi.string().email().required(), password: Joi.string().required() });
