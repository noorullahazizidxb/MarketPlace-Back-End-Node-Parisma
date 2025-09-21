import { renewService } from '../services/renewService.js';
import { redeemRenewSchema } from '../validation/renew.js';

export const renewController = {
  async redeem(req, res) {
  const { error, value } = redeemRenewSchema.validate(req.body);
    if (error) return res.apiError(error.message, 400);
    try {
  const listing = await renewService.redeemToken(value.token);
  // reload listing with relations for response
  const { prisma } = await import('../config/prisma.js');
  const full = await prisma.listing.findUnique({ where: { id: listing.id }, include: { images: true, user: { include: { roles: true } }, category: true, representatives: { include: { representative: true } } } });
  res.apiSuccess(full, 'Redeemed', 200);
    } catch (e) {
      res.apiError(e.message, 400);
    }
  }
};

renewController.listTokens = async function (req, res) {
  try {
    const page = parseInt(req.query.page || '1', 10);
    const perPage = parseInt(req.query.perPage || '50', 10);
    const { prisma } = await import('../config/prisma.js');
  const items = await prisma.listingRenewToken.findMany({ skip: (page - 1) * perPage, take: perPage, orderBy: { issuedAt: 'desc' }, include: { listing: { include: { images: true, user: { include: { roles: true } }, category: true } } } });
    return res.apiSuccess(items, 'OK', 200);
  } catch (e) {
    return res.apiError('Failed to list tokens', 500);
  }
};

renewController.getToken = async function (req, res) {
  try {
    const id = Number(req.params.id);
    const { prisma } = await import('../config/prisma.js');
    const t = await prisma.listingRenewToken.findUnique({ where: { id } });
    if (!t) return res.apiError('Not found', 404);
    res.apiSuccess(t, 'OK', 200);
  } catch (e) { res.apiError('Failed', 500); }
};

renewController.updateToken = async function (req, res) {
  try {
    const id = Number(req.params.id);
    const data = req.body;
    const { prisma } = await import('../config/prisma.js');
    const updated = await prisma.listingRenewToken.update({ where: { id }, data });
    res.apiSuccess(updated, 'Updated', 200);
  } catch (e) { res.apiError('Failed', 500); }
};

renewController.patchToken = async function (req, res) {
  try {
    const id = Number(req.params.id);
    const payload = req.body;
    const data = {};
    for (const k of Object.keys(payload)) data[k] = payload[k];
    const { prisma } = await import('../config/prisma.js');
    const updated = await prisma.listingRenewToken.update({ where: { id }, data });
    res.apiSuccess(updated, 'Patched', 200);
  } catch (e) { res.apiError('Failed', 500); }
};

// delete token route removed per policy
