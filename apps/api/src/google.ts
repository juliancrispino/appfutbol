import { OAuth2Client } from 'google-auth-library'
import type { GoogleProfile } from './deps'
import { HttpError } from './errors'

export async function verifyGoogleIdToken(idToken: string, audiences: string[]): Promise<GoogleProfile | null> {
  if (audiences.length === 0) throw new HttpError(503, 'El ingreso con Google no está configurado')
  const client = new OAuth2Client()
  const ticket = await client.verifyIdToken({ idToken, audience: audiences })
  const payload = ticket.getPayload()
  if (!payload?.sub || !payload.email) return null
  const email = payload.email.toLowerCase()
  return {
    sub: payload.sub,
    email,
    name: payload.name?.trim() || email.split('@')[0],
  }
}
