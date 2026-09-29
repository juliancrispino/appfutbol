import { createHash, randomBytes, randomInt, timingSafeEqual } from 'node:crypto'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import type { Db } from './db'
import type { AppDeps } from './deps'
import { HttpError } from './errors'

const ACCESS_SECONDS = 15 * 60
const REFRESH_MS = 30 * 24 * 60 * 60 * 1000
const CODE_MS = 10 * 60 * 1000

export type UserRow = {
  id: string
  email: string
  name: string
  password_hash: string | null
  google_sub: string | null
}

const codeAttempts = new Map<string, number[]>()

export function publicUser(user: UserRow) {
  return { id: user.id, email: user.email, name: user.name }
}

export function hashToken(value: string) {
  return createHash('sha256').update(value).digest('hex')
}

function hashCode(secret: string, email: string, code: string) {
  return createHash('sha256').update(`${secret}:${email}:${code}`).digest('hex')
}

export function codesMatch(secret: string, email: string, code: string, expectedHash: string) {
  const actual = Buffer.from(hashCode(secret, email, code))
  const expected = Buffer.from(expectedHash)
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}

export async function issueSession(deps: AppDeps, user: UserRow) {
  const accessToken = jwt.sign({ sub: user.id }, deps.jwtSecret, { expiresIn: ACCESS_SECONDS })
  const refreshToken = randomBytes(32).toString('base64url')
  const expiresAt = new Date(Date.now() + REFRESH_MS).toISOString()
  await deps.db.query(
    `INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at) VALUES ($1, $2, $3, $4)`,
    [crypto.randomUUID(), user.id, hashToken(refreshToken), expiresAt],
  )
  return {
    accessToken,
    refreshToken,
    user: publicUser(user),
  }
}

export function readUserId(deps: AppDeps, header: string | undefined) {
  const match = header?.match(/^Bearer\s+(.+)$/i)
  if (!match) throw new HttpError(401, 'Tenés que iniciar sesión')
  try {
    const payload = jwt.verify(match[1], deps.jwtSecret) as { sub?: string }
    if (!payload.sub) throw new Error('missing subject')
    return payload.sub
  } catch (error) {
    if (error instanceof HttpError) throw error
    throw new HttpError(401, 'Sesión vencida')
  }
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10)
}

export async function checkPassword(password: string, passwordHash: string) {
  return bcrypt.compare(password, passwordHash)
}

export function assertCanSendCode(email: string) {
  const now = Date.now()
  const recent = (codeAttempts.get(email) ?? []).filter((time) => now - time < 60 * 60 * 1000)
  if (recent.length >= 5) throw new HttpError(429, 'Esperá un rato antes de pedir otro código')
  recent.push(now)
  codeAttempts.set(email, recent)
}

export function resetCodeAttempts() {
  codeAttempts.clear()
}

export function createEmailCode(secret: string, email: string) {
  const code = String(randomInt(0, 1_000_000)).padStart(6, '0')
  return {
    code,
    codeHash: hashCode(secret, email, code),
    expiresAt: new Date(Date.now() + CODE_MS).toISOString(),
  }
}

export function inviteUrl(publicAppUrl: string, token: string) {
  return `${publicAppUrl.replace(/\/$/, '')}/j/${token}`
}

export function newInviteToken() {
  return randomBytes(24).toString('base64url')
}
