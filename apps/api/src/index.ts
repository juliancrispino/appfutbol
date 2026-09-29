import { mkdirSync } from 'node:fs'
import { serve } from '@hono/node-server'
import { fileURLToPath } from 'node:url'
import pg from 'pg'
import { createApp } from './app'
import { createPgDb, createPgliteDb, type Db } from './db'
import { createMailer } from './mail'
import { migrate } from './schema'
import { verifyGoogleIdToken } from './google'
import { loadEnv } from './env'

loadEnv()

const databaseUrl = process.env.DATABASE_URL
const jwtSecret = process.env.JWT_SECRET
if (!databaseUrl) throw new Error('Falta DATABASE_URL')
if (!jwtSecret) throw new Error('Falta JWT_SECRET')

const db = await openDatabase(databaseUrl)
await migrate(db)

const app = createApp({
  db,
  jwtSecret,
  publicAppUrl: process.env.PUBLIC_APP_URL || `http://localhost:${process.env.PORT || 8787}`,
  googleClientIds: (process.env.GOOGLE_CLIENT_IDS || '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean),
  mailer: createMailer(),
  verifyGoogleIdToken,
  exposeEmailCodes: process.env.NODE_ENV !== 'production' || process.env.EXPOSE_EMAIL_CODES === 'true',
})

const port = Number(process.env.PORT || 8787)
serve({ fetch: app.fetch, port }, () => {
  console.log(`API de Turnos en http://localhost:${port}`)
})

async function openDatabase(databaseUrl: string): Promise<Db> {
  if (databaseUrl === 'pglite') {
    const { PGlite } = await import('@electric-sql/pglite')
    const dataDir = fileURLToPath(new URL('../.data/pglite', import.meta.url))
    mkdirSync(dataDir, { recursive: true })
    return createPgliteDb(new PGlite(dataDir))
  }

  const pool = new pg.Pool({
    connectionString: databaseUrl,
    ssl:
      databaseUrl.includes('localhost') || databaseUrl.includes('127.0.0.1')
        ? undefined
        : { rejectUnauthorized: false },
  })
  return createPgDb(pool)
}
