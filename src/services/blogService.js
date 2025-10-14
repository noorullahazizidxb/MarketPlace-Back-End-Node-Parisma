import { blogRepository } from '../repositories/blogRepository.js';

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
  async listBlogs() {
    return blogRepository.list();
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
  async getById(id) {
    return blogRepository.getById(id);
  }
};
