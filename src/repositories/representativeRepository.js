import { prisma } from '../config/prisma.js';

export const representativeRepository = {
  async create(data) {
    return prisma.representativeInfo.create({ data });
  },
  async listByRegion(region) {
    return prisma.representativeInfo.findMany({ where: { region: region, active: true } });
  },
  async getById(id) {
    return prisma.representativeInfo.findUnique({ where: { id } });
  }
};
