import { Router } from 'express';
import { config } from '../config/index.js';
import { runScheduledJob } from '../jobs/runScheduled.js';

const router = Router();

function authorized(req) {
  const secret = config.cron.secret;
  if (!secret) return false;
  const header = req.get('authorization') || '';
  const bearer = header.startsWith('Bearer ') ? header.slice('Bearer '.length).trim() : '';
  const alternate = req.get('x-cron-secret') || '';
  return bearer === secret || alternate === secret;
}

router.get('/:name', async (req, res) => {
  if (!authorized(req)) return res.apiError('Unauthorized', 401);
  try {
    await runScheduledJob(req.params.name);
    return res.apiSuccess({ job: req.params.name }, 'OK', 200);
  } catch (error) {
    return res.apiError(error.message || 'Cron job failed', error.status || 500);
  }
});

export default router;
