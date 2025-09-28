import { adRepository } from '../repositories/adRepository.js';
import { logger } from '../utils/logger.js';

export const adService = {
  async createAd(payload) {
    const data = {
      title: payload.title,
      body: payload.body || null,
      imageUrl: payload.imageUrl || null,
      placement: payload.placement,
      isActive: payload.isActive !== undefined ? payload.isActive : true
    };
    const ad = await adRepository.create(data);
    logger.info({ adId: ad.id }, 'Created ad');
    return ad;
  },
  async updateAd(id, payload) {
    const data = {};
    if (payload.title !== undefined) data.title = payload.title;
    if (payload.body !== undefined) data.body = payload.body;
    if (payload.imageUrl !== undefined) data.imageUrl = payload.imageUrl;
    if (payload.placement !== undefined) data.placement = payload.placement;
    if (payload.isActive !== undefined) data.isActive = payload.isActive;
    const ad = await adRepository.update(id, data);
    logger.info({ adId: ad.id }, 'Updated ad');
    return ad;
  },
  async deleteAd(id) {
    const ad = await adRepository.delete(id);
    logger.info({ adId: ad.id }, 'Deleted ad');
    return ad;
  },
  async getAd(id) {
    return await adRepository.getById(id);
  },
  async listAds(filter, opts) {
    return await adRepository.list(filter, opts);
  }
};
