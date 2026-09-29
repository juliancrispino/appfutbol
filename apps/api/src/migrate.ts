import pg from 'pg'
import { createPgDb } from './db'
import { loadEnv } from './env'
import { migrate } from './schema'

loadEnv()

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) throw new Error('Falta DATABASE_URL')

const pool = new pg.Pool({ connectionString: databaseUrl })
await migrate(createPgDb(pool))
await pool.end()
console.log('Esquema listo')
