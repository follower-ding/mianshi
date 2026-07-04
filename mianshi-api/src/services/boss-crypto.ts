import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'

const ALGO = 'aes-256-gcm'

function getKey() {
  const secret = process.env.BOSS_ENCRYPTION_KEY || process.env.JWT_SECRET
  if (!secret) {
    throw new Error(
      'BOSS_ENCRYPTION_KEY or JWT_SECRET must be configured to encrypt Boss session cookies.\n' +
        'Set BOSS_ENCRYPTION_KEY in mianshi-api/.env (recommended: separate from JWT_SECRET)\n' +
        'Generate: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'base64\'))"',
    )
  }
  return createHash('sha256').update(secret).digest()
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv(ALGO, getKey(), iv)
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${iv.toString('base64')}:${tag.toString('base64')}:${enc.toString('base64')}`
}

export function decryptSecret(payload: string): string {
  if (!payload || typeof payload !== 'string') {
    throw new Error('decryptSecret: payload is required')
  }
  const parts = payload.split(':')
  if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) {
    throw new Error('decryptSecret: malformed payload, expected iv:tag:data format')
  }
  const [ivB64, tagB64, dataB64] = parts
  const decipher = createDecipheriv(ALGO, getKey(), Buffer.from(ivB64, 'base64'))
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'))
  return Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64')), decipher.final()]).toString('utf8')
}
