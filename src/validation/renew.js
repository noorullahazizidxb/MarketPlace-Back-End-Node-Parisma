import Joi from 'joi';

export const redeemRenewSchema = Joi.object({ token: Joi.string().required() });
