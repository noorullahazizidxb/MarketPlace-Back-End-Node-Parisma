import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRoleService } from '../src/services/roleService.js';

function fakeRepo(users) {
  const repo = {
    async findUserWithRoles(id) { const u = users[id]; return u ? { id, roles: u.map((role) => ({ role })) } : null; },
    async countAdmins() { return Object.values(users).filter((r) => r.includes('ADMIN')).length; },
    async replaceRoles(id, roles) { users[id] = roles; return { id, roles: roles.map((role) => ({ role })) }; },
    transaction: (fn) => fn(repo),
  };
  return repo;
}
const revoked = [];
const tokenService = { revokeAllForUser: async (id) => revoked.push(id) };

test('admin can promote a user and the user sessions are revoked', async () => {
  const users = { a: ['ADMIN'], b: ['USER'] };
  const svc = createRoleService({ repository: fakeRepo(users), tokenService });
  const res = await svc.changeUserRole({ userId: 'b', role: 'ADMIN' });
  assert.deepEqual(res.roles, [{ role: 'ADMIN' }]);
  assert.ok(revoked.includes('b'));
});

test('cannot demote the last admin', async () => {
  const users = { a: ['ADMIN'], b: ['USER'] };
  const svc = createRoleService({ repository: fakeRepo(users), tokenService });
  await assert.rejects(svc.changeUserRole({ userId: 'a', role: 'USER' }), { statusCode: 409, message: /last admin/ });
  assert.deepEqual(users.a, ['ADMIN']);
});

test('can demote an admin when another admin exists', async () => {
  const users = { a: ['ADMIN'], b: ['ADMIN'] };
  const svc = createRoleService({ repository: fakeRepo(users), tokenService });
  await svc.changeUserRole({ userId: 'a', role: 'REPRESENTATIVE' });
  assert.deepEqual(users.a, ['REPRESENTATIVE']);
});

test('unknown user / role produce 404 / 400', async () => {
  const svc = createRoleService({ repository: fakeRepo({}), tokenService });
  await assert.rejects(svc.changeUserRole({ userId: 'zz', role: 'USER' }), { statusCode: 404, message: 'User not found' });
  await assert.rejects(svc.changeUserRole({ userId: 'zz', role: 'GOD' }), { statusCode: 400 });
});
