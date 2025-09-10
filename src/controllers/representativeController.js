import { representativeService } from '../services/representativeService.js';
import { representativeInfoSchema } from '../validation/representative.js';

export const representativeController = {
  async create(req, res) {
  const { error, value } = representativeInfoSchema.validate(req.body);
  if (error) return res.apiError(error.message, 400);
  const userId = req.user?.id;
  const rep = await representativeService.create(value, userId);
  res.apiSuccess(rep, 'Created', 201);
  },

  async listByRegion(req, res) {
    const region = req.query.region;
  const reps = await representativeService.listByRegion(region);
  res.apiSuccess(reps, 'OK', 200);
  }
};
