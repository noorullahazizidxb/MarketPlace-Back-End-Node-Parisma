import { prisma } from '../config/prisma.js';

export const storyRepository = {
  async create(data) {
    return prisma.story.create({ data });
  },
  async update(id, data) {
    return prisma.story.update({ where: { id }, data });
  },
  async remove(id) {
    // delete images then story (onDelete Cascade already removes images, but explicit for clarity)
    await prisma.storyImage.deleteMany({ where: { storyId: id } });
    return prisma.story.delete({ where: { id } });
  },
  async addImages(storyId, images) {
    if (!images?.length) return { count: 0 };
    const rows = images.map((url, i) => ({ storyId, url, position: i }));
    await prisma.storyImage.createMany({ data: rows });
    return { count: rows.length };
  },
  async list() {
    return prisma.story.findMany({ orderBy: { createdAt: 'desc' }, include: { images: true, user: { select: { id: true, fullName: true, photo: true } } } });
  }
};
