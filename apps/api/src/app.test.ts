import assert from 'node:assert/strict'
import test from 'node:test'
import { PGlite } from '@electric-sql/pglite'
import { resetCodeAttempts } from './auth'
import { createApp } from './app'
import { createPgliteDb } from './db'
import type { GoogleProfile } from './deps'
import { migrate } from './schema'

async function setup() {
  const client = new PGlite()
  const db = createPgliteDb(client)
  await migrate(db)
  const sent: { email: string; code: string }[] = []
  const app = createApp({
    db,
    jwtSecret: 'test-secret',
    publicAppUrl: 'http://localhost:8787',
    googleClientIds: ['test-client'],
    exposeEmailCodes: true,
    mailer: {
      async sendCode(email, code) {
        sent.push({ email, code })
      },
    },
    async verifyGoogleIdToken(idToken): Promise<GoogleProfile | null> {
      if (!idToken.startsWith('google:')) return null
      const [, sub, email, name] = idToken.split(':')
      return { sub, email, name }
    },
  })
  return { app, sent }
}

async function api(
  app: Awaited<ReturnType<typeof setup>>['app'],
  path: string,
  options: { method?: string; token?: string; body?: unknown } = {},
) {
  const headers = new Headers()
  if (options.body !== undefined) headers.set('content-type', 'application/json')
  if (options.token) headers.set('authorization', `Bearer ${options.token}`)
  const response = await app.request(path, {
    method: options.method ?? (options.body === undefined ? 'GET' : 'POST'),
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  })
  const text = await response.text()
  const json = text ? JSON.parse(text) : null
  return { status: response.status, json }
}

test('cuentas, invitación, reclamo de ficha y Elo del turno', async () => {
  resetCodeAttempts()
  const { app, sent } = await setup()

  const ana = await api(app, '/api/auth/register', {
    body: { email: 'Ana@test.com', password: 'secreto123', name: 'Ana' },
  })
  assert.equal(ana.status, 201)
  const anaToken = ana.json.accessToken as string

  const wrong = await api(app, '/api/auth/login', {
    body: { email: 'ana@test.com', password: 'nope' },
  })
  assert.equal(wrong.status, 401)

  const code = await api(app, '/api/auth/email-code', { body: { email: 'beto@test.com' } })
  assert.equal(code.status, 200)
  assert.equal(sent.at(-1)?.code, code.json.devCode)

  const beto = await api(app, '/api/auth/email-code/verify', {
    body: { email: 'beto@test.com', code: code.json.devCode, name: 'Beto' },
  })
  assert.equal(beto.status, 200)
  const betoToken = beto.json.accessToken as string

  const reused = await api(app, '/api/auth/email-code/verify', {
    body: { email: 'beto@test.com', code: code.json.devCode },
  })
  assert.equal(reused.status, 400)

  const google = await api(app, '/api/auth/google', {
    body: { idToken: 'google:cari-sub:cari@test.com:Cari' },
  })
  assert.equal(google.status, 201)
  const cariToken = google.json.accessToken as string

  const linked = await api(app, '/api/auth/google', {
    body: { idToken: 'google:ana-sub:ana@test.com:Ana Google' },
  })
  assert.equal(linked.status, 200)
  assert.equal(linked.json.user.id, ana.json.user.id)

  const refreshed = await api(app, '/api/auth/refresh', {
    method: 'POST',
    body: { refreshToken: ana.json.refreshToken },
  })
  assert.equal(refreshed.status, 200)
  assert.equal(refreshed.json.user.email, 'ana@test.com')

  const created = await api(app, '/api/groups', {
    token: anaToken,
    body: { name: 'Martes', displayName: 'Ana', preferredPosition: 'forward', isCrack: true },
  })
  assert.equal(created.status, 201)
  const groupId = created.json.group.id as string
  const anaMemberId = created.json.meMemberId as string

  const guest = await api(app, `/api/groups/${groupId}/members`, {
    token: anaToken,
    body: { displayName: 'Maxi', preferredPosition: 'midfielder' },
  })
  assert.equal(guest.status, 201)
  assert.equal(guest.json.isGuest, true)
  const maxiId = guest.json.id as string

  const played = await api(app, `/api/groups/${groupId}/matches`, {
    token: anaToken,
    body: {
      playedAt: '2026-03-01',
      teamAScore: 2,
      teamBScore: 1,
      mvpMemberId: maxiId,
      notes: 'Cancha 2',
      roster: [
        { memberId: anaMemberId, team: 'A', goals: 2 },
        { memberId: maxiId, team: 'B', goals: 1 },
      ],
    },
  })
  assert.equal(played.status, 201)

  const before = await api(app, `/api/groups/${groupId}`, { token: anaToken })
  const maxiBefore = before.json.members.find((member: { id: string }) => member.id === maxiId)
  assert.equal(maxiBefore.elo, 984)
  assert.equal(maxiBefore.goals, 1)
  assert.equal(maxiBefore.mvps, 1)
  assert.equal(maxiBefore.losses, 1)
  const anaBefore = before.json.members.find((member: { id: string }) => member.id === anaMemberId)
  assert.equal(anaBefore.elo, 1016)
  assert.equal(anaBefore.wins, 1)

  const invite = await api(app, `/api/groups/${groupId}/invite`, { token: anaToken })
  const token = invite.json.token as string
  const preview = await api(app, `/api/join/${token}`, { token: betoToken })
  assert.equal(preview.json.guests.length, 1)
  assert.equal(preview.json.guests[0].displayName, 'Maxi')

  const claimed = await api(app, `/api/join/${token}`, {
    token: betoToken,
    body: { claimMemberId: maxiId },
  })
  assert.equal(claimed.status, 200)
  assert.equal(claimed.json.alreadyMember, false)

  const after = await api(app, `/api/groups/${groupId}`, { token: betoToken })
  const maxiAfter = after.json.members.find((member: { id: string }) => member.id === maxiId)
  assert.equal(maxiAfter.userId, beto.json.user.id)
  assert.equal(maxiAfter.elo, 984)
  assert.equal(maxiAfter.displayName, 'Maxi')
  assert.equal(maxiAfter.isGuest, false)

  const outsider = await api(app, `/api/groups/${groupId}`, { token: cariToken })
  assert.equal(outsider.status, 404)

  const joined = await api(app, `/api/join/${token}`, {
    token: cariToken,
    body: { displayName: 'Cari', preferredPosition: 'defender' },
  })
  assert.equal(joined.status, 201)

  const forbidden = await api(app, `/api/groups/${groupId}`, {
    method: 'DELETE',
    token: cariToken,
  })
  assert.equal(forbidden.status, 403)

  const rotated = await api(app, `/api/groups/${groupId}/invite/regenerate`, {
    method: 'POST',
    token: anaToken,
  })
  assert.equal(rotated.status, 200)
  const stale = await api(app, `/api/join/${token}`, { token: cariToken })
  assert.equal(stale.status, 404)

  const removed = await api(app, `/api/groups/${groupId}/matches/${played.json.id}`, {
    method: 'DELETE',
    token: anaToken,
  })
  assert.equal(removed.status, 200)
  const reset = await api(app, `/api/groups/${groupId}`, { token: anaToken })
  const anaReset = reset.json.members.find((member: { id: string }) => member.id === anaMemberId)
  assert.equal(anaReset.elo, 1000)
  assert.equal(anaReset.wins, 0)

  const page = await app.request(`/j/${rotated.json.token}`)
  assert.equal(page.status, 200)
  assert.match(await page.text(), /Martes/)

  const privacy = await app.request('/privacidad')
  assert.match(await privacy.text(), /AdMob/)
})
