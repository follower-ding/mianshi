import { createHash } from 'node:crypto'
import type { Context, Next } from 'hono'
import type { AuthUser } from '../types/entities.js'
import { verifyToken } from '../services/auth.js'

export type AuthVariables = {
  user: AuthUser | null
}

export async function authMiddleware(c: Context<{ Variables: AuthVariables }>, next: Next) {
  const header = c.req.header('Authorization')
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null
  c.set('user', token ? await verifyToken(token) : null)
  await next()
}

export function requireAuth(c: Context<{ Variables: AuthVariables }>) {
  const user = c.get('user')
  if (!user) return c.json({ error: 'Unauthorized' }, 401)
  return user
}

export function requireAdmin(c: Context<{ Variables: AuthVariables }>) {
  const user = requireAuth(c)
  if (user instanceof Response) return user
  if (user.role !== 'admin') return c.json({ error: 'Forbidden' }, 403)
  return user
}

export function optionalUser(c: Context<{ Variables: AuthVariables }>) {
  return c.get('user')
}
