import bcrypt from 'bcrypt';

export async function hashPassword(plain) {
  const saltRounds = 10;
  return await bcrypt.hash(plain, saltRounds);
}

export async function comparePassword(plain, hash) {
  return await bcrypt.compare(plain, hash);
}
