import { createStorySchema, updateStorySchema } from '../validation/story.js';
import { storyService } from '../services/storyService.js';
import { logger } from '../utils/logger.js';

export const storyController = {
  async create(req, res) {
    try {
      // admin check (only admin users can post Story items)
      if (!req.user || !req.user.roles?.includes('ADMIN')) return res.apiError('Forbidden', 403);
      const payload = { ...req.body };
      // parse JSON images if provided as string (multipart cases)
      if (typeof payload.images === 'string') { try { payload.images = JSON.parse(payload.images); } catch (e) {} }
      const { error, value } = createStorySchema.validate(payload);
      if (error) return res.apiError(error.message, 400);
      const story = await storyService.createStory(value, req.user.id);
      // broadcast WS event
      try {
        const { getIO } = await import('../websocket/socket.js');
        getIO().emit('storyCreated', story);
      } catch (e) { /* socket not ready - ignore */ }
      return res.apiSuccess(story, 'Created', 201);
    } catch (e) {
      logger.error(e);
      return res.apiError(e.status === 403 ? 'Forbidden' : 'Internal Server Error', e.status || 500);
    }
  },

  async list(req, res) {
    try {
      const stories = await storyService.listStories();
      return res.apiSuccess(stories, 'OK', 200);
    } catch (e) {
      logger.error(e);
      return res.apiError('Failed', 500);
    }
  }
};

export async function updateStory(req, res) {
  try {
    if (!req.user || !req.user.roles?.includes('ADMIN')) return res.apiError('Forbidden', 403);
    const id = req.params.id;
    const payload = { ...req.body };
    if (typeof payload.images === 'string') { try { payload.images = JSON.parse(payload.images); } catch (e) {} }
    const { error, value } = updateStorySchema.validate(payload);
    if (error) return res.apiError(error.message, 400);
    const updated = await storyService.updateStory(id, value);
    try {
      const { getIO } = await import('../websocket/socket.js');
      getIO().emit('storyUpdated', { id, story: updated });
    } catch {}
    return res.apiSuccess(updated, 'Updated', 200);
  } catch (e) {
    logger.error(e);
    return res.apiError('Failed', 500);
  }
}

export async function deleteStory(req, res) {
  try {
    if (!req.user || !req.user.roles?.includes('ADMIN')) return res.apiError('Forbidden', 403);
    const id = req.params.id;
    await storyService.deleteStory(id);
    try {
      const { getIO } = await import('../websocket/socket.js');
      getIO().emit('storyDeleted', { id });
    } catch {}
    return res.apiSuccess({ id }, 'Deleted', 200);
  } catch (e) {
    logger.error(e);
    return res.apiError('Failed', 500);
  }
}
