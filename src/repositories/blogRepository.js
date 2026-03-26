import { prisma } from '../config/prisma.js';

const blogInclude = {
  comments: { include: { author: { select: { id: true, fullName: true, photo: true } } } },
  author: { select: { id: true, fullName: true, photo: true } }
};

export const blogRepository = {
  async create(data) {
    return prisma.blog.create({ data });
  },
  async getById(id) {
    return prisma.blog.findUnique({ where: { id }, include: blogInclude });
  },
  async list(query) {
    return prisma.blog.findMany({
      where: {
        status: 'APPROVED',
        ...(query ? {
          OR: [
            { title: { contains: query } },
            { content: { contains: query } },
            { author: { fullName: { contains: query } } }
          ]
        } : {})
      },
      orderBy: { createdAt: 'desc' },
      include: blogInclude
    });
  },
  async listPending() {
    return prisma.blog.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
      include: blogInclude
    });
  },
  async listAll({ status, q, page = 1, limit = 20 } = {}) {
    const where = {};
    if (status) where.status = status;
    if (q) {
      where.OR = [
        { title: { contains: q } },
        { content: { contains: q } },
        { author: { fullName: { contains: q } } }
      ];
    }
    return prisma.blog.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: blogInclude
    });
  },
  async setStatus(id, status, extra = {}) {
    return prisma.blog.update({ where: { id }, data: { status, ...extra } });
  },
  async listByIds(ids) {
    const blogs = await prisma.blog.findMany({
      where: { id: { in: ids }, status: 'APPROVED' },
      include: blogInclude
    });

    const order = new Map(ids.map((id, index) => [String(id), index]));
    return blogs.sort((left, right) => (order.get(String(left.id)) ?? 0) - (order.get(String(right.id)) ?? 0));
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
  ,
  async remove(id) {
    // delete comments first (cascade may handle it, but be explicit)
    await prisma.blogComment.deleteMany({ where: { blogId: id } });
    return prisma.blog.delete({ where: { id } });
  }
};
