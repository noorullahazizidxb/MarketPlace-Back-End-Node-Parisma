import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import fs from 'node:fs/promises';
import path from 'node:path';
import { hashPassword } from '../src/utils/password.js';

dotenv.config();

const prisma = new PrismaClient({ adapter: { provider: 'mysql', url: process.env.DATABASE_URL } });
const backendRoot = process.cwd();
const profileDir = path.resolve(backendRoot, 'dummydata', 'UserProfileImages');

function sanitizeFileName(fileName) {
  return fileName.toLowerCase().replace(/[^a-z0-9.]+/g, '-');
}

async function attachAdminPhoto(userId) {
  try {
    const files = (await fs.readdir(profileDir)).sort((left, right) => left.localeCompare(right));
    const fileName = files[0];
    if (!fileName) return null;

    const sourcePath = path.join(profileDir, fileName);
    const extension = path.extname(fileName) || '.jpg';
    const destinationDir = path.resolve(backendRoot, 'uploads', 'users');
    const destinationName = sanitizeFileName(`${userId}${extension.toLowerCase()}`);
    const destinationPath = path.join(destinationDir, destinationName);

    await fs.mkdir(destinationDir, { recursive: true });
    await fs.copyFile(sourcePath, destinationPath);

    return `/uploads/users/${destinationName}`;
  } catch {
    return null;
  }
}

async function seed() {
  const email = process.env.ADMIN_EMAIL || 'admin@marketplace.example.com';
  const phone = process.env.ADMIN_PHONE || '+93700000001';
  const password = process.env.ADMIN_PASSWORD || 'MarketPlace@2026';
  const passwordHash = await hashPassword(password);

  const baseUserData = {
    email,
    phone,
    passwordHash,
    firstName: 'Marketplace',
    lastName: 'Admin',
    fullName: 'Marketplace Admin',
    contacts: {
      phone,
      whatsapp: phone,
      telegram: phone,
    },
    address: {
      street: 'House 22, Street 14',
      district: 'Wazir Akbar Khan',
      city: 'Kabul',
      province: 'Kabul',
      country: 'Afghanistan',
    },
    metadata: {
      department: 'Operations',
      seededAt: new Date().toISOString(),
      isSeedAccount: true,
    },
  };

  const user = await prisma.user.upsert({
    where: { email },
    update: baseUserData,
    create: baseUserData,
  });

  const photo = await attachAdminPhoto(user.id);
  if (photo) {
    await prisma.user.update({
      where: { id: user.id },
      data: { photo },
    });
  }

  await prisma.userRole.upsert({
    where: { userId_role: { userId: user.id, role: 'ADMIN' } },
    update: {},
    create: { userId: user.id, role: 'ADMIN' },
  });

  console.log(`Admin user ready: ${user.email}`);
  console.log(`Admin password: ${password}`);
}

seed()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
