import { Platform } from 'react-native'
import { getSession, setSession } from './session'
import type { Session } from './types'

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
  }
}

export function apiBase() {
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL.replace(/\/$/, '')
  return Platform.OS === 'android' ? 'http://10.0.2.2:8787' : 'http://localhost:8787'
}

let refreshing: Promise<boolean> | null = null

async function refreshSession() {
  const current = getSession()
  if (!current) return false
  if (!refreshing) {
    refreshing = (async () => {
      try {
        const response = await fetch(`${apiBase()}/api/auth/refresh`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ refreshToken: current.refreshToken }),
        })
        if (!response.ok) {
          await setSession(null)
          return false
        }
        await setSession((await response.json()) as Session)
        return true
      } catch {
        return false
      } finally {
        refreshing = null
      }
    })()
  }
  return refreshing
}

export async function api<T>(path: string, options: { method?: string; body?: unknown; auth?: boolean } = {}): Promise<T> {
  const auth = options.auth !== false

  const run = async () => {
    const headers = new Headers()
    if (options.body !== undefined) headers.set('content-type', 'application/json')
    const current = getSession()
    if (auth && current) headers.set('authorization', `Bearer ${current.accessToken}`)
    const response = await fetch(`${apiBase()}${path}`, {
      method: options.method ?? (options.body === undefined ? 'GET' : 'POST'),
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    })
    const text = await response.text()
    const json = text ? JSON.parse(text) : null
    return { response, json }
  }

  let result = await run()
  if (result.response.status === 401 && auth && (await refreshSession())) result = await run()
  if (!result.response.ok) {
    throw new ApiError(result.response.status, result.json?.error || 'No se pudo completar la acción')
  }
  return result.json as T
}
