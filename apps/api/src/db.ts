import { PGlite } from '@electric-sql/pglite'
import pg from 'pg'

export type Db = {
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>
  one<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T | null>
  tx<T>(fn: (db: Db) => Promise<T>): Promise<T>
}

function wrap(queryable: {
  query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }>
}): Pick<Db, 'query' | 'one'> {
  return {
    async query<T>(sql: string, params: unknown[] = []) {
      const result = await queryable.query(sql, params)
      return result.rows as T[]
    },
    async one<T>(sql: string, params: unknown[] = []) {
      const rows = await this.query<T>(sql, params)
      return rows[0] ?? null
    },
  }
}

export function createPgDb(pool: pg.Pool): Db {
  const base = wrap(pool)
  return {
    ...base,
    async tx(fn) {
      const client = await pool.connect()
      const txDb: Db = {
        ...wrap(client),
        tx: (inner) => inner(txDb),
      }
      try {
        await client.query('BEGIN')
        const result = await fn(txDb)
        await client.query('COMMIT')
        return result
      } catch (error) {
        await client.query('ROLLBACK')
        throw error
      } finally {
        client.release()
      }
    },
  }
}

export function createPgliteDb(client: PGlite): Db {
  const base = wrap(client)
  return {
    ...base,
    async tx(fn) {
      return client.transaction(async (tx) => {
        const txDb: Db = {
          ...wrap(tx),
          tx: (inner) => inner(txDb),
        }
        return fn(txDb)
      })
    },
  }
}
