import Joi from 'joi';
import { ListingStatus } from '../constants/enums.js';

export const listingFeedbackSchema = Joi.object({
  listingId: Joi.string().required(),
  userId: Joi.string().required(),
  statusAfter: Joi.string().valid(...Object.values(ListingStatus)).required(),
  comment: Joi.string().optional()
});
