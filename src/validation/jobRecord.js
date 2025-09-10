import Joi from 'joi';

export const jobRecordSchema = Joi.object({
  queue: Joi.string().required(),
  jobId: Joi.string().required(),
  name: Joi.string().required(),
  payload: Joi.object().optional(),
  status: Joi.string().optional(),
  lastError: Joi.string().optional(),
  processedAt: Joi.date().iso().optional()
});
