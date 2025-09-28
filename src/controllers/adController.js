import { adService } from '../services/adService.js';
import { AdPlacement } from '../constants/enums.js';

function validPlacement(p) {
  return Object.values(AdPlacement).includes(p);
}

export const adController = {
  async create(req, res) {
    try {
      const payload = { ...req.body };
      if (!payload.title) return res.apiError('Title is required', 400);
      if (!payload.placement || !validPlacement(payload.placement)) return res.apiError('Invalid placement', 400);
      const ad = await adService.createAd(payload);
      return res.apiSuccess(ad, 'Created', 201);
    } catch (e) {
      return res.apiError(e?.message || 'Failed to create ad', 500);
    }
  },
  async update(req, res) {
    try {
      const id = parseInt(req.params.id, 10);
      if (!id) return res.apiError('Invalid id', 400);
      const payload = { ...req.body };
      if (payload.placement && !validPlacement(payload.placement)) return res.apiError('Invalid placement', 400);
      const ad = await adService.updateAd(id, payload);
      return res.apiSuccess(ad, 'OK', 200);
    } catch (e) {
      return res.apiError(e?.message || 'Failed to update ad', 500);
    }
  },
  async remove(req, res) {
    try {
      const id = parseInt(req.params.id, 10);
      if (!id) return res.apiError('Invalid id', 400);
      const ad = await adService.deleteAd(id);
      return res.apiSuccess(ad, 'Deleted', 200);
    } catch (e) {
      return res.apiError(e?.message || 'Failed to delete ad', 500);
    }
  },
  async get(req, res) {
    try {
      const id = parseInt(req.params.id, 10);
      if (!id) return res.apiError('Invalid id', 400);
      const ad = await adService.getAd(id);
      if (!ad) return res.apiError('Not found', 404);
      return res.apiSuccess(ad, 'OK', 200);
    } catch (e) {
      return res.apiError(e?.message || 'Failed to fetch ad', 500);
    }
  },
  async list(req, res) {
    try {
      const filter = {};
      if (req.query.placement) filter.placement = req.query.placement;
      if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';
      const opts = { take: parseInt(req.query.take || '50', 10), skip: parseInt(req.query.skip || '0', 10) };
      const rows = await adService.listAds(filter, opts);
      return res.apiSuccess(rows, 'OK', 200);
    } catch (e) {
      return res.apiError(e?.message || 'Failed to list ads', 500);
    }
  }
};
