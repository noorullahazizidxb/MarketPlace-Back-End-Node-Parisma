import { prisma } from '../config/prisma.js';
import { Roles } from '../constants/enums.js';

export const userRoleRepository = {
  /** Run `fn(repo)` inside a DB transaction with a transaction-bound repository. */
  transaction(fn) {
    return prisma.$transaction((tx) => fn(bind(tx)), { isolationLevel: 'Serializable' });
  },
  ...bind(prisma),
};

function bind(db) {
  return {
    findUserWithRoles(userId) {
      return db.user.findUnique({ where: { id: userId }, select: { id: true, email: true, fullName: true, roles: true } });
    },
    countAdmins() {
      return db.userRole.count({ where: { role: Roles.ADMIN } });
    },
    async replaceRoles(userId, roles) {
      await db.userRole.deleteMany({ where: { userId } });
      for (const role of roles) await db.userRole.create({ data: { userId, role } });
      return db.user.findUnique({ where: { id: userId }, select: { id: true, email: true, fullName: true, roles: true } });
    },
  };
}
