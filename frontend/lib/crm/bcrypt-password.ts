/**
 * Clerk uses bcrypt. Better Auth defaults to scrypt.
 * Match Clerk so migrated Pavilion users keep their passwords.
 */
import bcrypt from 'bcrypt'

const BCRYPT_ROUNDS = 10

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS)
}

export async function verifyPassword(data: {
  hash: string
  password: string
}): Promise<boolean> {
  return bcrypt.compare(data.password, data.hash)
}
