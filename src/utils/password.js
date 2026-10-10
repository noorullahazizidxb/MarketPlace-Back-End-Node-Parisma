import bcrypt from 'bcryptjs';

export async function hashPassword(plain) {
  const saltRounds = 10;
  return bcrypt.hash(plain, saltRounds);
}

export async function comparePassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}
