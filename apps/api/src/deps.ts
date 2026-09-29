import type { Db } from './db'

export type GoogleProfile = {
  sub: string
  email: string
  name: string
}

export type Mailer = {
  sendCode(email: string, code: string): Promise<void>
}

export type AppDeps = {
  db: Db
  jwtSecret: string
  publicAppUrl: string
  googleClientIds: string[]
  mailer: Mailer
  verifyGoogleIdToken: (idToken: string, audiences: string[]) => Promise<GoogleProfile | null>
  exposeEmailCodes: boolean
}
