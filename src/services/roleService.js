import { Roles } from '../constants/enums.js';
import { ConflictError, NotFoundError, ValidationError } from '../utils/AppError.js';

/**
 * Role management use-case. Business rules:
 *  - target user must exist
 *  - role must be a known role
 *  - the last remaining ADMIN can never be demoted
 *  - the target's refresh tokens are revoked so new privileges apply on next sign-in/refresh
 */
export function createRoleService({ repository, tokenService }) {
  return {
    async changeUserRole({ userId, role }) {
      if (!Object.values(Roles).includes(role)) throw new ValidationError(`Unknown role "${role}"`);
      const updated = await repository.transaction(async (repo) => {
        const user = await repo.findUserWithRoles(userId);
        if (!user) throw new NotFoundError('User');
        const current = user.roles.map((r) => r.role);
        if (current.length === 1 && current[0] === role) return user; // no-op
        const losingAdmin = current.includes(Roles.ADMIN) && role !== Roles.ADMIN;
        if (losingAdmin && (await repo.countAdmins()) <= 1) {
          throw new ConflictError('Cannot remove the last admin. Promote another user to admin first');
        }
        return repo.replaceRoles(userId, [role]);
      });
      try { await tokenService?.revokeAllForUser(userId); } catch { /* table may not exist yet */ }
      return updated;
    },
  };
}
