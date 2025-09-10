import Joi from 'joi';

export const forwardListingSchema = Joi.object({
  listingId: Joi.string().required(),
  region: Joi.string().required(),
  buyerMessage: Joi.string().required(),
  buyerContact: Joi.string().required()
});
