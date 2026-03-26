import { blogRepository } from '../repositories/blogRepository.js';
import { config } from '../config/index.js';
import { searchBlogs } from '../search/elasticsearch.js';

export const blogService = {
  async createBlog(payload, authorId) {
    const { title, content, images = [] } = payload;
    return blogRepository.create({ title, content, images, authorId });
  },
  async updateBlog(id, payload, userId) {
    const existing = await blogRepository.getById(id);
    if (!existing) throw new Error('Not found');
    if (existing.authorId !== userId) {
      const e = new Error('Forbidden');
      e.status = 403;
      throw e;
    }
    return blogRepository.update(id, payload);
  },
  async deleteBlog(id) {
    return blogRepository.remove(id);
  },
  async listBlogs(query) {
    const term = typeof query === 'string' ? query.trim() : '';
    if (!term) return blogRepository.list();

    if (!config.elastic.enabled) {
      return blogRepository.list(term);
    }

    try {
      const result = await searchBlogs(term);
      if (!result.ids.length) return [];
      return blogRepository.listByIds(result.ids);
    } catch (error) {
      return blogRepository.list(term);
    }
  },
  async addComment(blogId, userId, body) {
    return blogRepository.addComment(blogId, userId, body);
  },
  async like(blogId, userId) {
    return blogRepository.toggleLike(blogId, userId);
  },
  async share(blogId, userId) {
    return blogRepository.toggleShare(blogId, userId);
  },
  async approveBlog(id) {
    const blog = await blogRepository.getById(id);
    if (!blog) throw new Error('Not found');
    const expiryDays = config.retention.blogDefaultExpiryDays || 90;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiryDays);
    return blogRepository.setStatus(id, 'APPROVED', { expiresAt });
  },
  async rejectBlog(id) {
    const blog = await blogRepository.getById(id);
    if (!blog) throw new Error('Not found');
    return blogRepository.setStatus(id, 'REJECTED');
  },
  async renewBlog(id, userId) {
    const blog = await blogRepository.getById(id);
    if (!blog) throw new Error('Not found');
    if (blog.authorId !== userId) {
      const e = new Error('Forbidden');
      e.status = 403;
      throw e;
    }
    if (blog.status !== 'APPROVED') throw new Error('Only approved blogs can be renewed');
    const expiryDays = config.retention.blogDefaultExpiryDays || 90;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiryDays);
    return blogRepository.setStatus(id, 'APPROVED', { expiresAt, renewedAt: new Date() });
  },
  async listPendingBlogs() {
    return blogRepository.listPending();
  },
  async getById(id) {
    return blogRepository.getById(id);
  },
  async listAll({ status, q, page = 1, limit = 20 } = {}) {
    return blogRepository.listAll({ status, q, page, limit });
  }
};
