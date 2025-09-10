import Joi from 'joi';

export const searchSchema = Joi.object({
  q: Joi.string().allow('', null),
  category: Joi.string().allow(null),
  listingType: Joi.string().valid('RENT','SALE').optional(),
  status: Joi.string().optional(),
  minPrice: Joi.number().min(0).optional(),
  maxPrice: Joi.number().min(0).optional(),
  location: Joi.string().optional(),
  page: Joi.number().min(1).default(1),
  perPage: Joi.number().min(1).max(100).default(20),
  sortBy: Joi.string().valid('createdAt','price').default('createdAt'),
  sortOrder: Joi.string().valid('asc','desc').default('desc')
});
