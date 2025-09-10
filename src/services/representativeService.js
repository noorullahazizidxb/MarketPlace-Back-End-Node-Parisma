import { representativeRepository } from '../repositories/representativeRepository.js';

export const representativeService = {
  async create(payload, userId) {
    const data = { ...payload, user: { connect: { id: userId } } };
    return representativeRepository.create(data);
  },
  async listByRegion(region) {
    return representativeRepository.listByRegion(region);
  }
};
