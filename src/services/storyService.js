import { storyRepository } from '../repositories/storyRepository.js';

export const storyService = {
  async createStory(payload, userId) {
    const { title, description, images = [], videoUrl } = payload;
    const story = await storyRepository.create({ title, description, videoUrl: videoUrl || null, userId });
    await storyRepository.addImages(story.id, images);
    return story;
  },
  async updateStory(id, payload) {
    const data = { ...payload };
    const { images, ...rest } = data;
    const updated = await storyRepository.update(id, rest);
    if (Array.isArray(images)) {
      // Replace images: remove existing then add new ones ordered
      await storyRepository.removeImages?.(id); // optional if implemented later
      // fallback: delete via prisma here if removeImages not implemented
      try {
        await (await import('../config/prisma.js')).prisma.storyImage.deleteMany({ where: { storyId: id } });
      } catch {}
      await storyRepository.addImages(id, images);
    }
    return updated;
  },
  async deleteStory(id) {
    return storyRepository.remove(id);
  },
  async listStories() {
    return storyRepository.list();
  }
};
