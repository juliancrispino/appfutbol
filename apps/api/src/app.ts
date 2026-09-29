import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { z } from 'zod'
import {
  assertCanSendCode,
  checkPassword,
  codesMatch,
  createEmailCode,
  hashPassword,
  hashToken,
  inviteUrl,
  issueSession,
  newInviteToken,
  publicUser,
  readUserId,
} from './auth'
import type { AppDeps } from './deps'
import { HttpError } from './errors'
import { joinHtml, missingInviteHtml, privacyHtml } from './pages'
import {
  claimGuest,
  createGroup,
  deleteGroup,
  deleteMatch,
  deleteMember,
  deleteRefresh,
  findActiveCode,
  findRefresh,
  findUserByEmail,
  findUserByGoogleSub,
  findUserById,
  getGroupByToken,
  getMember,
  getMembership,
  groupDetail,
  insertMember,
  insertUser,
  listGroups,
  listMembers,
  markCodeUsed,
  renameGroup,
  replaceEmailCode,
  requireMembership,
  rotateInvite,
  saveMatch,
  setGoogleSub,
  updateMember,
  type MatchInput,
  type MemberProfile,
} from './repo'

const emailSchema = z.string().trim().email('Email inválido').max(200).transform((value) => value.toLowerCase())
const nameSchema = z.string().trim().min(1, 'El nombre es obligatorio').max(60, 'El nombre es muy largo')
const passwordSchema = z.string().min(8, 'La contraseña necesita al menos 8 caracteres').max(200)
const positionSchema = z.enum(['goalkeeper', 'defender', 'midfielder', 'forward'])

const profileSchema = z.object({
  displayName: z.string().trim().min(1, 'El nombre es obligatorio').max(40, 'El nombre es muy largo'),
  preferredPosition: positionSchema.optional(),
  isGoalkeeper: z.boolean().optional(),
  isCrack: z.boolean().optional(),
})

const matchSchema = z.object({
  playedAt: z.string().min(8, 'La fecha es obligatoria'),
  teamAScore: z.number().int().min(0).max(99),
  teamBScore: z.number().int().min(0).max(99),
  mvpMemberId: z.string().nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
  roster: z
    .array(
      z.object({
        memberId: z.string().min(1),
        team: z.enum(['A', 'B']),
        goals: z.number().int().min(0).max(99),
      }),
    )
    .min(2, 'El partido necesita jugadores'),
})

function profileOf(input: z.infer<typeof profileSchema>): MemberProfile {
  const isGoalkeeper = Boolean(input.isGoalkeeper)
  return {
    displayName: input.displayName.trim(),
    isGoalkeeper,
    preferredPosition: isGoalkeeper ? 'goalkeeper' : input.preferredPosition ?? 'midfielder',
    isCrack: Boolean(input.isCrack),
  }
}

function parse<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data)
  if (!result.success) throw new HttpError(400, result.error.issues[0]?.message ?? 'Datos inválidos')
  return result.data
}

function matchInput(data: z.infer<typeof matchSchema>): MatchInput {
  const playedAt = new Date(data.playedAt)
  if (Number.isNaN(playedAt.getTime())) throw new HttpError(400, 'La fecha no es válida')
  const notes = data.notes?.trim() ? data.notes.trim() : null
  return {
    playedAt: playedAt.toISOString(),
    teamAScore: data.teamAScore,
    teamBScore: data.teamBScore,
    mvpMemberId: data.mvpMemberId ?? null,
    notes,
    roster: data.roster,
  }
}

function fallbackName(email: string) {
  const local = email.split('@')[0]?.replace(/[._-]+/g, ' ').trim()
  if (!local) return 'Jugador'
  return local.slice(0, 60)
}

export function createApp(deps: AppDeps) {
  const app = new Hono()
  app.use('/api/*', cors())

  app.onError((error, c) => {
    if (error instanceof HttpError) return c.json({ error: error.message }, error.status as 400)
    console.error(error)
    return c.json({ error: 'Error interno' }, 500)
  })

  async function jsonBody(c: { req: { json: () => Promise<unknown> } }) {
    try {
      return await c.req.json()
    } catch {
      throw new HttpError(400, 'El cuerpo de la solicitud no es válido')
    }
  }

  async function userIdOf(c: { req: { header: (name: string) => string | undefined } }) {
    return readUserId(deps, c.req.header('authorization'))
  }

  app.get('/health', (c) => c.json({ ok: true }))
  app.get('/privacidad', (c) => c.html(privacyHtml()))
  app.get('/.well-known/assetlinks.json', (c) => {
    const fingerprint = process.env.ANDROID_SHA256_CERT_FINGERPRINT
    if (!fingerprint) return c.json([])
    return c.json([
      {
        relation: ['delegate_permission/common.handle_all_urls'],
        target: {
          namespace: 'android_app',
          package_name: 'app.turnos.futbol',
          sha256_cert_fingerprints: [fingerprint],
        },
      },
    ])
  })

  app.get('/j/:token', async (c) => {
    const group = await getGroupByToken(deps.db, c.req.param('token'))
    if (!group) return c.html(missingInviteHtml(), 404)
    return c.html(joinHtml({ groupName: group.name, token: c.req.param('token') }))
  })

  app.post('/api/auth/register', async (c) => {
    const data = parse(
      z.object({ email: emailSchema, password: passwordSchema, name: nameSchema }),
      await jsonBody(c),
    )
    if (await findUserByEmail(deps.db, data.email)) throw new HttpError(409, 'Ese email ya tiene cuenta')
    const user = await insertUser(deps.db, {
      id: crypto.randomUUID(),
      email: data.email,
      name: data.name,
      passwordHash: await hashPassword(data.password),
      googleSub: null,
    })
    if (!user) throw new HttpError(500, 'No se pudo crear la cuenta')
    return c.json(await issueSession(deps, user), 201)
  })

  app.post('/api/auth/login', async (c) => {
    const data = parse(z.object({ email: emailSchema, password: z.string().min(1) }), await jsonBody(c))
    const user = await findUserByEmail(deps.db, data.email)
    if (!user?.password_hash || !(await checkPassword(data.password, user.password_hash))) {
      throw new HttpError(401, 'Email o contraseña incorrectos')
    }
    return c.json(await issueSession(deps, user))
  })

  app.post('/api/auth/email-code', async (c) => {
    const data = parse(z.object({ email: emailSchema }), await jsonBody(c))
    assertCanSendCode(data.email)
    const created = createEmailCode(deps.jwtSecret, data.email)
    await replaceEmailCode(deps.db, {
      id: crypto.randomUUID(),
      email: data.email,
      codeHash: created.codeHash,
      expiresAt: created.expiresAt,
    })
    await deps.mailer.sendCode(data.email, created.code)
    return c.json({ ok: true, ...(deps.exposeEmailCodes ? { devCode: created.code } : {}) })
  })

  app.post('/api/auth/email-code/verify', async (c) => {
    const data = parse(
      z.object({
        email: emailSchema,
        code: z.string().regex(/^\d{6}$/, 'El código tiene 6 números'),
        name: z.string().trim().max(60).optional(),
      }),
      await jsonBody(c),
    )
    const active = await findActiveCode(deps.db, data.email)
    if (!active || !codesMatch(deps.jwtSecret, data.email, data.code, active.code_hash)) {
      throw new HttpError(400, 'Código inválido o vencido')
    }
    await markCodeUsed(deps.db, active.id)
    let user = await findUserByEmail(deps.db, data.email)
    if (!user) {
      user = await insertUser(deps.db, {
        id: crypto.randomUUID(),
        email: data.email,
        name: data.name?.trim() || fallbackName(data.email),
        passwordHash: null,
        googleSub: null,
      })
    }
    if (!user) throw new HttpError(500, 'No se pudo entrar')
    return c.json(await issueSession(deps, user))
  })

  app.post('/api/auth/google', async (c) => {
    const data = parse(z.object({ idToken: z.string().min(10, 'Falta el token de Google') }), await jsonBody(c))
    let profile
    try {
      profile = await deps.verifyGoogleIdToken(data.idToken, deps.googleClientIds)
    } catch (error) {
      if (error instanceof HttpError) throw error
      throw new HttpError(401, 'No se pudo validar la cuenta de Google')
    }
    if (!profile) throw new HttpError(401, 'No se pudo validar la cuenta de Google')

    const bySub = await findUserByGoogleSub(deps.db, profile.sub)
    if (bySub) return c.json(await issueSession(deps, bySub))

    const byEmail = await findUserByEmail(deps.db, profile.email)
    if (byEmail) {
      if (byEmail.google_sub && byEmail.google_sub !== profile.sub) {
        throw new HttpError(409, 'Ese email ya está vinculado a otra cuenta de Google')
      }
      await setGoogleSub(deps.db, byEmail.id, profile.sub)
      return c.json(await issueSession(deps, { ...byEmail, google_sub: profile.sub }))
    }

    const created = await insertUser(deps.db, {
      id: crypto.randomUUID(),
      email: profile.email,
      name: profile.name,
      passwordHash: null,
      googleSub: profile.sub,
    })
    if (!created) throw new HttpError(500, 'No se pudo crear la cuenta')
    return c.json(await issueSession(deps, created), 201)
  })

  app.post('/api/auth/refresh', async (c) => {
    const data = parse(z.object({ refreshToken: z.string().min(10) }), await jsonBody(c))
    const stored = await findRefresh(deps.db, hashToken(data.refreshToken))
    if (!stored || new Date(stored.expires_at).getTime() <= Date.now()) {
      throw new HttpError(401, 'La sesión expiró')
    }
    await deleteRefresh(deps.db, stored.id)
    const user = await findUserById(deps.db, stored.user_id)
    if (!user) throw new HttpError(401, 'La sesión expiró')
    return c.json(await issueSession(deps, user))
  })

  app.post('/api/auth/logout', async (c) => {
    const data = parse(z.object({ refreshToken: z.string().optional() }), await jsonBody(c))
    if (data.refreshToken) {
      const stored = await findRefresh(deps.db, hashToken(data.refreshToken))
      if (stored) await deleteRefresh(deps.db, stored.id)
    }
    return c.json({ ok: true })
  })

  app.get('/api/me', async (c) => {
    const user = await findUserById(deps.db, await userIdOf(c))
    if (!user) throw new HttpError(401, 'Tenés que iniciar sesión')
    return c.json(publicUser(user))
  })

  app.get('/api/groups', async (c) => {
    return c.json({ groups: await listGroups(deps.db, await userIdOf(c)) })
  })

  app.post('/api/groups', async (c) => {
    const userId = await userIdOf(c)
    const data = parse(z.object({ name: nameSchema }).merge(profileSchema), await jsonBody(c))
    const groupId = await createGroup(deps.db, {
      ownerId: userId,
      name: data.name.trim(),
      inviteToken: newInviteToken(),
      profile: profileOf(data),
    })
    return c.json(await groupDetail(deps.db, groupId, userId, deps.publicAppUrl), 201)
  })

  app.get('/api/groups/:id', async (c) => {
    const userId = await userIdOf(c)
    return c.json(await groupDetail(deps.db, c.req.param('id'), userId, deps.publicAppUrl))
  })

  app.patch('/api/groups/:id', async (c) => {
    const userId = await userIdOf(c)
    const data = parse(z.object({ name: nameSchema }), await jsonBody(c))
    const membership = await requireMembership(deps.db, c.req.param('id'), userId)
    if (String(membership.owner_user_id) !== userId) throw new HttpError(403, 'Solo el creador puede hacer esto')
    await renameGroup(deps.db, c.req.param('id'), data.name.trim())
    return c.json(await groupDetail(deps.db, c.req.param('id'), userId, deps.publicAppUrl))
  })

  app.delete('/api/groups/:id', async (c) => {
    const userId = await userIdOf(c)
    const membership = await requireMembership(deps.db, c.req.param('id'), userId)
    if (String(membership.owner_user_id) !== userId) throw new HttpError(403, 'Solo el creador puede hacer esto')
    await deleteGroup(deps.db, c.req.param('id'))
    return c.json({ ok: true })
  })

  app.get('/api/groups/:id/invite', async (c) => {
    const userId = await userIdOf(c)
    const membership = await requireMembership(deps.db, c.req.param('id'), userId)
    const token = String(membership.invite_token)
    return c.json({ token, url: inviteUrl(deps.publicAppUrl, token) })
  })

  app.post('/api/groups/:id/invite/regenerate', async (c) => {
    const userId = await userIdOf(c)
    const membership = await requireMembership(deps.db, c.req.param('id'), userId)
    if (String(membership.owner_user_id) !== userId) throw new HttpError(403, 'Solo el creador puede hacer esto')
    const token = newInviteToken()
    await rotateInvite(deps.db, c.req.param('id'), token)
    return c.json({ token, url: inviteUrl(deps.publicAppUrl, token) })
  })

  app.get('/api/join/:token', async (c) => {
    const userId = await userIdOf(c)
    const group = await getGroupByToken(deps.db, c.req.param('token'))
    if (!group) throw new HttpError(404, 'La invitación no existe')
    const membership = await getMembership(deps.db, group.id, userId)
    const guests = (await listMembers(deps.db, group.id)).filter((member) => member.isGuest)
    return c.json({
      groupId: group.id,
      groupName: group.name,
      alreadyMember: Boolean(membership),
      guests,
    })
  })

  app.post('/api/join/:token', async (c) => {
    const userId = await userIdOf(c)
    const group = await getGroupByToken(deps.db, c.req.param('token'))
    if (!group) throw new HttpError(404, 'La invitación no existe')
    if (await getMembership(deps.db, group.id, userId)) {
      return c.json({ groupId: group.id, alreadyMember: true })
    }
    const data = parse(
      z.object({
        claimMemberId: z.string().optional(),
        displayName: z.string().trim().max(40).optional(),
        preferredPosition: positionSchema.optional(),
        isGoalkeeper: z.boolean().optional(),
        isCrack: z.boolean().optional(),
      }),
      await jsonBody(c),
    )
    if (data.claimMemberId) {
      const result = await claimGuest(deps.db, group.id, data.claimMemberId, userId)
      return c.json({ groupId: group.id, alreadyMember: result.alreadyMember })
    }
    const profile = profileOf({
      displayName: data.displayName ?? '',
      preferredPosition: data.preferredPosition,
      isGoalkeeper: data.isGoalkeeper,
      isCrack: data.isCrack,
    })
    if (!profile.displayName) throw new HttpError(400, 'El nombre es obligatorio')
    try {
      await insertMember(deps.db, { groupId: group.id, userId, profile })
    } catch (error) {
      if (isUniqueViolation(error)) return c.json({ groupId: group.id, alreadyMember: true })
      throw error
    }
    return c.json({ groupId: group.id, alreadyMember: false }, 201)
  })

  app.get('/api/groups/:id/members', async (c) => {
    const userId = await userIdOf(c)
    await requireMembership(deps.db, c.req.param('id'), userId)
    return c.json({ members: await listMembers(deps.db, c.req.param('id')) })
  })

  app.post('/api/groups/:id/members', async (c) => {
    const userId = await userIdOf(c)
    await requireMembership(deps.db, c.req.param('id'), userId)
    const profile = profileOf(parse(profileSchema, await jsonBody(c)))
    const id = await insertMember(deps.db, { groupId: c.req.param('id'), userId: null, profile })
    return c.json(await getMember(deps.db, c.req.param('id'), id), 201)
  })

  app.patch('/api/groups/:id/members/:memberId', async (c) => {
    const userId = await userIdOf(c)
    const membership = await requireMembership(deps.db, c.req.param('id'), userId)
    const member = await getMember(deps.db, c.req.param('id'), c.req.param('memberId'))
    if (!member) throw new HttpError(404, 'Jugador no encontrado')
    const isOwner = String(membership.owner_user_id) === userId
    const isSelf = member.userId === userId
    if (!isOwner && !isSelf && !member.isGuest) throw new HttpError(403, 'No podés editar esa ficha')
    await updateMember(deps.db, c.req.param('id'), member.id, profileOf(parse(profileSchema, await jsonBody(c))))
    return c.json(await getMember(deps.db, c.req.param('id'), member.id))
  })

  app.delete('/api/groups/:id/members/:memberId', async (c) => {
    const userId = await userIdOf(c)
    const membership = await requireMembership(deps.db, c.req.param('id'), userId)
    const member = await getMember(deps.db, c.req.param('id'), c.req.param('memberId'))
    if (!member) throw new HttpError(404, 'Jugador no encontrado')
    if (member.userId && member.userId === String(membership.owner_user_id)) {
      throw new HttpError(400, 'El creador no se puede sacar del turno')
    }
    const isOwner = String(membership.owner_user_id) === userId
    const isSelf = member.userId === userId
    if (!isOwner && !isSelf) throw new HttpError(403, 'Solo el creador puede sacar jugadores')
    await deleteMember(deps.db, c.req.param('id'), member.id)
    return c.json({ ok: true })
  })

  app.post('/api/groups/:id/matches', async (c) => {
    const userId = await userIdOf(c)
    await requireMembership(deps.db, c.req.param('id'), userId)
    const id = await saveMatch(deps.db, c.req.param('id'), matchInput(parse(matchSchema, await jsonBody(c))))
    return c.json({ id }, 201)
  })

  app.patch('/api/groups/:id/matches/:matchId', async (c) => {
    const userId = await userIdOf(c)
    await requireMembership(deps.db, c.req.param('id'), userId)
    const id = await saveMatch(
      deps.db,
      c.req.param('id'),
      matchInput(parse(matchSchema, await jsonBody(c))),
      c.req.param('matchId'),
    )
    return c.json({ id })
  })

  app.delete('/api/groups/:id/matches/:matchId', async (c) => {
    const userId = await userIdOf(c)
    await requireMembership(deps.db, c.req.param('id'), userId)
    await deleteMatch(deps.db, c.req.param('id'), c.req.param('matchId'))
    return c.json({ ok: true })
  })

  return app
}

function isUniqueViolation(error: unknown) {
  return typeof error === 'object' && error !== null && 'code' in error && (error as { code?: string }).code === '23505'
}
