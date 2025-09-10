import { renewService } from '../services/renewService.js';
import Joi from 'joi';

const issueSchema = Joi.object({ listingId: Joi.string().required() });
const redeemSchema = Joi.object({ token: Joi.string().required() });

export const renewController = {
  async issue(req, res) {
    const { error, value } = issueSchema.validate(req.body);
  if (error) return res.apiError(error.message, 400);
  const token = await renewService.issueToken(value.listingId);
  res.apiSuccess({ token }, 'Issued', 200);
  },
  async redeem(req, res) {
    const { error, value } = redeemSchema.validate(req.body);
    if (error) return res.apiError(error.message, 400);
    try {
      const listing = await renewService.redeemToken(value.token);
      res.apiSuccess(listing, 'Redeemed', 200);
    } catch (e) {
      res.apiError(e.message, 400);
    }
  }
};
