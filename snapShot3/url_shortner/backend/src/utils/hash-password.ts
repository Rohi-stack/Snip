import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12; // 12 rounds is a strong default for bcrypt

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
