import { representativeRepository } from '../repositories/representativeRepository.js';

export const representativeService = {
  async create(payload, userId) {
    const data = { ...payload, user: { connect: { id: userId } } };
    return representativeRepository.create(data);
  },
  async listByRegion(region) {
    return representativeRepository.listByRegion(region);
  },
  async bindMany(userId, reps) {
    const items = Array.isArray(reps) ? reps : [reps];
    const created = [];
    for (const r of items) {
      if (!r || !r.region) continue;
      try {
        const data = { region: r.region, whatsappNumber: r.whatsappNumber || null, active: r.active !== undefined ? r.active : true };
        const rec = await representativeRepository.create({ ...data, user: { connect: { id: userId } } });
        created.push(rec);
      } catch (e) {
        // skip duplicates / errors silently
      }
    }
    return created;
  }
};
