import { prisma } from '../config/prisma.js';

export const blogRepository = {
  async create(data) {
    return prisma.blog.create({ data });
  },
  async getById(id) {
    return prisma.blog.findUnique({ where: { id }, include: { comments: { include: { author: { select: { id: true, fullName: true, photo: true } } } }, author: { select: { id: true, fullName: true, photo: true } } } });
  },
  async list() {
    return prisma.blog.findMany({ orderBy: { createdAt: 'desc' }, include: { comments: { include: { author: { select: { id: true, fullName: true, photo: true } } } }, author: { select: { id: true, fullName: true, photo: true } } } });
  },
  async update(id, data) {
    return prisma.blog.update({ where: { id }, data });
  },
  async addComment(blogId, authorId, body) {
    return prisma.blogComment.create({ data: { blogId, authorId, body } });
  },
  async toggleLike(blogId, userId) {
    const b = await prisma.blog.findUnique({ where: { id: blogId }, select: { id: true, likes: true, likedBy: true } });
    if (!b) throw new Error('Not found');
    let likedBy = Array.isArray(b.likedBy) ? b.likedBy : [];
    const hasLiked = likedBy.includes(userId);
    if (hasLiked) {
      likedBy = likedBy.filter((u) => u !== userId);
    } else {
      likedBy.push(userId);
    }
    const likes = Math.max(0, (b.likes || 0) + (hasLiked ? -1 : 1));
    try {
      return await prisma.blog.update({ where: { id: blogId }, data: { likedBy, likes } });
    } catch (err) {
      // fallback: if likedBy not in schema, just update counter
      if (err && err.message && err.message.includes('Unknown argument `likedBy`')) {
        return prisma.blog.update({ where: { id: blogId }, data: { likes } });
      }
      throw err;
    }
  },
  async toggleShare(blogId, userId) {
    const b = await prisma.blog.findUnique({ where: { id: blogId }, select: { id: true, shares: true, sharedBy: true } });
    if (!b) throw new Error('Not found');
    let sharedBy = Array.isArray(b.sharedBy) ? b.sharedBy : [];
    const hasShared = sharedBy.includes(userId);
    if (hasShared) {
      sharedBy = sharedBy.filter((u) => u !== userId);
    } else {
      sharedBy.push(userId);
    }
    const shares = Math.max(0, (b.shares || 0) + (hasShared ? -1 : 1));
    try {
      return await prisma.blog.update({ where: { id: blogId }, data: { sharedBy, shares } });
    } catch (err) {
      // fallback: if sharedBy not in schema, just update counter
      if (err && err.message && err.message.includes('Unknown argument `sharedBy`')) {
        return prisma.blog.update({ where: { id: blogId }, data: { shares } });
      }
      throw err;
    }
  }
};
