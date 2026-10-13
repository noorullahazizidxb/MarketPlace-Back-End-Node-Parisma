import { logger } from '../utils/logger.js';
import {
  readUiContextState,
  writeUiContextState,
} from '../services/uiContextService.js';

export const uiContextController = {
  async get(_req, res) {
    try {
      const state = await readUiContextState();
      return res.apiSuccess(state ?? {}, 'OK', 200);
    } catch (error) {
      logger.error({ err: error?.message }, 'Failed to read UI context');
      return res.apiError('Failed to read UI context', 500);
    }
  },

  async update(req, res) {
    try {
      const state = await writeUiContextState(req.body);
      return res.apiSuccess(state, 'Updated', 200);
    } catch (error) {
      logger.error({ err: error?.message }, 'Failed to update UI context');
      const status = error instanceof TypeError ? 400 : 500;
      return res.apiError(error?.message || 'Failed to update UI context', status);
    }
  },
};
