import { categoryRepository } from '../repositories/categoryRepository.js';

export const categoryService = {
  async create(payload) {
    return categoryRepository.create(payload);
  },
  async list() {
    return categoryRepository.list();
  }
};
