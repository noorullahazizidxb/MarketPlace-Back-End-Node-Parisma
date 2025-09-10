import Joi from 'joi';
import { ListingType, ContactVisibility } from '../constants/enums.js';

export const createListingSchema = Joi.object({
  title: Joi.string().min(3).max(200).required(),
  description: Joi.string().min(10).required(),
  price: Joi.number().precision(2).min(0).required(),
  currency: Joi.string().max(5).default('AFN'),
  listingType: Joi.string().valid(...Object.values(ListingType)).required(),
  categoryId: Joi.number().integer().required(),
  location: Joi.string().allow(null, ''),
  address: Joi.string().allow(null, ''),
  contactVisibility: Joi.string().valid(...Object.values(ContactVisibility)).default(ContactVisibility.HIDE_SELLER),
  images: Joi.array().items(Joi.string().uri()).max(10)
});

export const approveListingSchema = Joi.object({
  contactVisibility: Joi.string().valid(...Object.values(ContactVisibility)).required(),
  hideSellerContact: Joi.boolean().default(false),
  notifyUser: Joi.boolean().default(true)
});
