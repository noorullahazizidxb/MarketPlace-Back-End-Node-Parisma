import { test } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { createTokenService } from '../src/services/tokenService.js';

const tokens = { secret: 'test-secret', adminAccessTtlSeconds: 3600, userAccessTtlSeconds: 86400, adminRefreshTtlSeconds: 43200, userRefreshTtlSeconds: 2592000, issuer: 'test' };
const silent = { warn() {} };

function memoryRepo() {
  const rows = new Map();
  let seq = 0;
  return {
    rows,
    async create(data) { const r = { id: `rt${++seq}`, revokedAt: null, replacedById: null, ...data }; rows.set(r.id, r); return r; },
    async findByHash(h) { return [...rows.values()].find((r) => r.tokenHash === h) || null; },
    async markReplaced(id, replacedById) { Object.assign(rows.get(id), { revokedAt: new Date(), replacedById }); },
    async revokeById(id) { const r = rows.get(id); if (r && !r.revokedAt) r.revokedAt = new Date(); },
    async revokeFamily(f) { for (const r of rows.values()) if (r.familyId === f && !r.revokedAt) r.revokedAt = new Date(); },
    async revokeAllForUser(u) { for (const r of rows.values()) if (r.userId === u && !r.revokedAt) r.revokedAt = new Date(); },
  };
}

const admin = { id: 'u-admin', roles: [{ role: 'ADMIN' }] };
const user = { id: 'u-user', roles: [{ role: 'USER' }] };

test('admin access tokens expire after 1 hour, regular users keep a longer TTL', async () => {
  const svc = createTokenService({ repository: memoryRepo(), tokens, log: silent });
  const a = jwt.decode((await svc.issueSession(admin)).accessToken);
  const u = jwt.decode((await svc.issueSession(user)).accessToken);
  assert.equal(a.exp - a.iat, 3600);
  assert.equal(u.exp - u.iat, 86400);
  assert.deepEqual(a.roles, ['ADMIN']);
});

test('refresh rotates the token and the old one cannot be reused', async () => {
  const repo = memoryRepo();
  const svc = createTokenService({ repository: repo, tokens, log: silent });
  const s1 = await svc.issueSession(admin);
  const { session: s2 } = await svc.rotate(s1.refreshToken, async () => admin);
  assert.notEqual(s2.refreshToken, s1.refreshToken);
  assert.ok(s2.accessToken);
  // reuse of the rotated token -> rejected and whole family revoked
  await assert.rejects(svc.rotate(s1.refreshToken, async () => admin), /revoked/);
  await assert.rejects(svc.rotate(s2.refreshToken, async () => admin), /revoked/);
});

test('logout revokes the session family', async () => {
  const svc = createTokenService({ repository: memoryRepo(), tokens, log: silent });
  const s = await svc.issueSession(user);
  assert.equal(await svc.revoke(s.refreshToken), true);
  await assert.rejects(svc.rotate(s.refreshToken, async () => user), /revoked/);
  assert.equal(await svc.revoke('unknown-token-value-xxxxxxxx'), false);
});

test('expired refresh tokens are rejected', async () => {
  let t = Date.now();
  const svc = createTokenService({ repository: memoryRepo(), tokens, log: silent, now: () => new Date(t) });
  const s = await svc.issueSession(admin);
  t += 43201 * 1000;
  await assert.rejects(svc.rotate(s.refreshToken, async () => admin), /expired/);
});

test('login still works (access token only) when refresh storage is unavailable', async () => {
  const repo = { create: async () => { const e = new Error('table missing'); e.code = 'P2021'; throw e; } };
  const svc = createTokenService({ repository: repo, tokens, log: silent });
  const s = await svc.issueSession(admin);
  assert.ok(s.accessToken);
  assert.equal(s.refreshToken, null);
});

test('verifyAccessToken rejects expired tokens', () => {
  const svc = createTokenService({ repository: memoryRepo(), tokens, log: silent });
  const expired = jwt.sign({ sub: 'x', typ: 'access', exp: Math.floor(Date.now() / 1000) - 10 }, tokens.secret);
  assert.throws(() => svc.verifyAccessToken(expired), { name: 'TokenExpiredError' });
});
