import Joi from 'joi';
import { Roles } from '../constants/enums.js';

export const assignRoleSchema = Joi.object({
  userId: Joi.string().required(),
  role: Joi.string().valid(...Object.values(Roles)).required(),
  metadata: Joi.object().optional()
});

export const changeRoleSchema = Joi.object({
  role: Joi.string().valid(...Object.values(Roles)).required(),
});
