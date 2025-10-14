import { storyRepository } from '../repositories/storyRepository.js';

export const storyService = {
  async createStory(payload, userId) {
    const { title, description, images = [], videoUrl } = payload;
    const story = await storyRepository.create({ title, description, videoUrl: videoUrl || null, userId });
    await storyRepository.addImages(story.id, images);
    return story;
  },
  async listStories() {
    return storyRepository.list();
  }
};
