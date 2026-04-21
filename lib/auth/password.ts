import { randomBytes, scrypt as scryptCb, timingSafeEqual } from 'crypto'
import { promisify } from 'util'

const scrypt = promisify(scryptCb)

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex')
  const derivedKey = (await scrypt(password, salt, 64)) as Buffer
  return `${salt}:${derivedKey.toString('hex')}`
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [salt, originalHash] = storedHash.split(':')

  if (!salt || !originalHash) {
    return false
  }

  const derivedKey = (await scrypt(password, salt, 64)) as Buffer
  const originalBuffer = Buffer.from(originalHash, 'hex')

  if (derivedKey.length !== originalBuffer.length) {
    return false
  }

  return timingSafeEqual(derivedKey, originalBuffer)
}
