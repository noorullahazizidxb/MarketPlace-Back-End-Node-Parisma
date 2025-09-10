import Joi from 'joi';

export const issueRenewSchema = Joi.object({ listingId: Joi.string().required() });
export const redeemRenewSchema = Joi.object({ token: Joi.string().required() });
