import express from 'express';
import Joi from 'joi';
import { config } from '../config/index.js';
import { verifyRecaptchaToken } from '../utils/recaptcha.js';
import { contactService } from '../services/contactService.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

const portfolioContactSchema = Joi.object({
  name: Joi.string().min(1).max(200).required(),
  email: Joi.string().email().required(),
  subject: Joi.string().min(1).max(200).required(),
  message: Joi.string().min(1).max(5000).required(),
  phone: Joi.string().allow('', null).optional(),
  recaptchaToken: Joi.string().required(),
  source: Joi.string().allow('', null).optional(),
});

/**
 * Public portfolio / cross-origin contact endpoint.
 * POST /api/public/contact
 * Verifies reCAPTCHA v3 then stores via contactService (mapped subject).
 */
router.post('/contact', async (req, res) => {
  try {
    const { error, value } = portfolioContactSchema.validate(req.body);
    if (error) return res.apiError(error.message, 400);

    await verifyRecaptchaToken(value.recaptchaToken, {
      secret: config.recaptcha.secretKey,
      minScore: config.recaptcha.minScore,
      expectedAction: 'contact',
      remoteip: req.ip,
    });

    const created = await contactService.createContact({
      name: value.name,
      email: value.email,
      phone: value.phone || null,
      subject: 'generalQuestion',
      message: `[${value.source || 'portfolio'}] ${value.subject}\n\n${value.message}`,
    });
    return res.apiSuccess(created, 'Created', 201);
  } catch (e) {
    logger.error(e, 'public contact failed');
    return res.apiError(e.message || 'Failed', e.status || 500);
  }
});

export default router;
