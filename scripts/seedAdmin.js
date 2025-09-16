import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/utils/password.js';

const prisma = new PrismaClient();

async function seed() {
  const email = process.env.ADMIN_EMAIL || 'admin@example.com';
  const phone = process.env.ADMIN_PHONE || null;
  const password = process.env.ADMIN_PASSWORD || 'ChangeMe123!';
  const passwordHash = await hashPassword(password);
  const user = await prisma.user.upsert({ where: { email }, update: { passwordHash }, create: { email, phone, passwordHash } });
  console.log('Admin user created:', user.id);
  await prisma.userRole.upsert({ where: { userId_role: { userId: user.id, role: 'ADMIN' } }, update: {}, create: { userId: user.id, role: 'ADMIN' } });
  console.log('Admin role assigned');
}

seed().catch(e => {
  console.error(e);
  process.exit(1);
}).finally(() => prisma.$disconnect());
