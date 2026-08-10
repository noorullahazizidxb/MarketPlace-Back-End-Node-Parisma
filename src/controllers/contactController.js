import { createContactSchema, listQuerySchema } from '../validation/contact.js';
import { contactService } from '../services/contactService.js';
import { logger } from '../utils/logger.js';
import { config } from '../config/index.js';
import { verifyRecaptchaToken } from '../utils/recaptcha.js';

export const contactController = {
  async create(req, res) {
    try {
      const payload = { ...req.body };
      try {
        await verifyRecaptchaToken(payload.recaptchaToken, {
          secret: config.recaptcha.secretKey,
          minScore: config.recaptcha.minScore,
          expectedAction: 'contact',
          remoteip: req.ip,
        });
      } catch (e) {
        return res.apiError(e.message || 'reCAPTCHA failed', e.status || 400);
      }
      delete payload.recaptchaToken;
      const { error, value } = createContactSchema.validate(payload);
      if (error) return res.apiError(error.message, 400);
      const created = await contactService.createContact(value);
      return res.apiSuccess(created, 'Created', 201);
    } catch (e) {
      logger.error(e, 'Failed to create contact');
      return res.apiError('Failed', 500);
    }
  },
  async list(req, res) {
    try {
      // Only admins can list contacts
      if (!req.user || !(req.user.roles || []).includes('ADMIN')) return res.apiError('Forbidden', 403);
      const items = await contactService.listContacts();
      return res.apiSuccess(items, 'OK', 200);
    } catch (e) {
      logger.error(e, 'Failed to list contacts');
      return res.apiError('Failed', 500);
    }
  },
  async get(req, res) {
    try {
      if (!req.user || !(req.user.roles || []).includes('ADMIN')) return res.apiError('Forbidden', 403);
      const id = Number(req.params.id);
      const item = await contactService.getContact(id);
      if (!item) return res.apiError('Not found', 404);
      return res.apiSuccess(item, 'OK', 200);
    } catch (e) {
      logger.error(e, 'Failed to get contact');
      return res.apiError('Failed', 500);
    }
  }
};
