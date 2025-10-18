import Joi from 'joi';

export const createContactSchema = Joi.object({
  name: Joi.string().min(1).max(200).required(),
  email: Joi.string().email().required(),
  subject: Joi.string().valid('generalQuestion','listingSupport','accountIssue','partnershipInquiry').required(),
  phone: Joi.string().allow(null, '').optional(),
  message: Joi.string().min(1).max(5000).required()
});

export const listQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).optional(),
  perPage: Joi.number().integer().min(1).max(100).optional()
});
