import { forwardingService } from '../services/forwardingService.js';
import Joi from 'joi';

const schema = Joi.object({ listingId: Joi.string().required(), region: Joi.string().required(), buyerMessage: Joi.string().required(), buyerContact: Joi.string().required() });

export const forwardController = {
  async forward(req, res) {
    const { error, value } = schema.validate(req.body);
  if (error) return res.apiError(error.message, 400);
  const results = await forwardingService.forwardToRepresentatives(value);
  return res.apiSuccess({ results }, 'Forwarded', 200);
  }
};
