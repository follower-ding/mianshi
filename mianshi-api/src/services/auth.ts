import bcrypt from 'bcryptjs'
import { SignJWT, jwtVerify } from 'jose'
import type { AuthUser, User, UserRole } from '../types/entities.js'
import { createUser, getUserByEmail, getUserById } from './store.js'
import { isPgEnabled } from '../db/client.js'

function toAuthUser(user: User): AuthUser {
  return { id: user.id, email: user.email, name: user.name, role: user.role }
}

function requireJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error(
      'JWT_SECRET is required but not set. Please configure it in mianshi-api/.env\n' +
        'Generate a strong secret: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'base64\'))"',
    )
  }
  return new TextEncoder().encode(secret)
}

const JWT_SECRET = requireJwtSecret()

const TOKEN_TTL = '7d'

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10)
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash)
}

export async function signToken(user: AuthUser) {
  return new SignJWT({ sub: user.id, email: user.email, role: user.role, name: user.name })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(TOKEN_TTL)
    .sign(JWT_SECRET)
}

export async function verifyToken(token: string): Promise<AuthUser | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    if (!payload.sub || typeof payload.sub !== 'string') return null
    if (isPgEnabled()) {
      const dbUser = await getUserById(payload.sub)
      if (!dbUser) return null
      return toAuthUser(dbUser)
    }
    return {
      id: payload.sub,
      email: String(payload.email ?? ''),
      name: String(payload.name ?? ''),
      role: (payload.role as UserRole) ?? 'user',
    }
  } catch {
    return null
  }
}

export async function registerUser(input: { email: string; password: string; name: string }) {
  if (!isPgEnabled()) throw new Error('Registration requires PostgreSQL')
  const existing = await getUserByEmail(input.email)
  if (existing) throw new Error('Email already registered')

  const passwordHash = await hashPassword(input.password)
  const user = await createUser({
    email: input.email,
    passwordHash,
    name: input.name,
    role: 'user',
  })
  const authUser = toAuthUser(user)
  const token = await signToken(authUser)
  return { user: authUser, token }
}

export async function loginUser(input: { email: string; password: string }) {
  if (!isPgEnabled()) throw new Error('Login requires PostgreSQL')
  const record = await getUserByEmail(input.email)
  if (!record) throw new Error('Invalid email or password')

  const ok = await verifyPassword(input.password, record.passwordHash)
  if (!ok) throw new Error('Invalid email or password')

  const authUser = toAuthUser(record)
  const token = await signToken(authUser)
  return { user: authUser, token }
}

export async function getAuthUserById(id: string) {
  const user = await getUserById(id)
  return user ? toAuthUser(user) : null
}

export async function ensureAdminUser() {
  if (!isPgEnabled()) return null
  const email = process.env.ADMIN_EMAIL ?? 'admin@mianshi.local'
  const isProd = process.env.NODE_ENV === 'production'
  const password = process.env.ADMIN_PASSWORD ?? (isProd ? '' : 'admin123456')
  if (!password) {
    throw new Error(
      '[Auth] ADMIN_PASSWORD is required in production. Set it in deploy/.env before starting the API.',
    )
  }
  const existing = await getUserByEmail(email)
  if (existing) return toAuthUser(existing)

  const passwordHash = await hashPassword(password)
  const user = await createUser({
    email,
    passwordHash,
    name: '管理员',
    role: 'admin',
  })
  console.log(`[Auth] Created default admin: ${email}`)
  return toAuthUser(user)
}
