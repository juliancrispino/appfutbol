import { recalculateElo } from '@turnos/domain'
import type { Db } from './db'
import { HttpError } from './errors'
import type { UserRow } from './auth'

type Row = Record<string, unknown>

function text(row: Row, key: string) {
  const value = row[key]
  return value == null ? null : String(value)
}

function num(row: Row, key: string) {
  return Number(row[key] ?? 0)
}

function flag(row: Row, key: string) {
  return Boolean(row[key])
}

function iso(value: unknown) {
  if (value instanceof Date) return value.toISOString()
  return new Date(String(value)).toISOString()
}

export function mapUser(row: Row): UserRow {
  return {
    id: String(row.id),
    email: String(row.email),
    name: String(row.name),
    password_hash: text(row, 'password_hash'),
    google_sub: text(row, 'google_sub'),
  }
}

export function mapMember(row: Row) {
  const userId = text(row, 'user_id')
  return {
    id: String(row.id),
    groupId: String(row.group_id),
    userId,
    displayName: String(row.display_name),
    isGoalkeeper: flag(row, 'is_goalkeeper'),
    preferredPosition: String(row.preferred_position),
    isCrack: flag(row, 'is_crack'),
    elo: num(row, 'elo'),
    wins: num(row, 'wins'),
    draws: num(row, 'draws'),
    losses: num(row, 'losses'),
    goals: num(row, 'goals'),
    mvps: num(row, 'mvps'),
    isGuest: userId == null,
  }
}

export async function findUserByEmail(db: Db, email: string) {
  const row = await db.one(`SELECT * FROM users WHERE email = $1`, [email])
  return row ? mapUser(row) : null
}

export async function findUserById(db: Db, id: string) {
  const row = await db.one(`SELECT * FROM users WHERE id = $1`, [id])
  return row ? mapUser(row) : null
}

export async function findUserByGoogleSub(db: Db, sub: string) {
  const row = await db.one(`SELECT * FROM users WHERE google_sub = $1`, [sub])
  return row ? mapUser(row) : null
}

export async function insertUser(
  db: Db,
  user: { id: string; email: string; name: string; passwordHash: string | null; googleSub: string | null },
) {
  await db.query(
    `INSERT INTO users (id, email, name, password_hash, google_sub) VALUES ($1, $2, $3, $4, $5)`,
    [user.id, user.email, user.name, user.passwordHash, user.googleSub],
  )
  return findUserById(db, user.id)
}

export async function setGoogleSub(db: Db, userId: string, sub: string) {
  await db.query(`UPDATE users SET google_sub = $1 WHERE id = $2`, [sub, userId])
}

export async function replaceEmailCode(db: Db, input: { id: string; email: string; codeHash: string; expiresAt: string }) {
  await db.query(`UPDATE email_codes SET used_at = CURRENT_TIMESTAMP WHERE email = $1 AND used_at IS NULL`, [input.email])
  await db.query(
    `INSERT INTO email_codes (id, email, code_hash, expires_at) VALUES ($1, $2, $3, $4)`,
    [input.id, input.email, input.codeHash, input.expiresAt],
  )
}

export async function findActiveCode(db: Db, email: string) {
  return db.one<{ id: string; code_hash: string }>(
    `SELECT id, code_hash FROM email_codes
     WHERE email = $1 AND used_at IS NULL AND expires_at > CURRENT_TIMESTAMP
     ORDER BY expires_at DESC
     LIMIT 1`,
    [email],
  )
}

export async function markCodeUsed(db: Db, id: string) {
  await db.query(`UPDATE email_codes SET used_at = CURRENT_TIMESTAMP WHERE id = $1`, [id])
}

export async function findRefresh(db: Db, tokenHash: string) {
  return db.one<{ id: string; user_id: string; expires_at: string | Date }>(
    `SELECT id, user_id, expires_at FROM refresh_tokens WHERE token_hash = $1`,
    [tokenHash],
  )
}

export async function deleteRefresh(db: Db, id: string) {
  await db.query(`DELETE FROM refresh_tokens WHERE id = $1`, [id])
}

export type MemberProfile = {
  displayName: string
  isGoalkeeper: boolean
  preferredPosition: string
  isCrack: boolean
}

export async function createGroup(db: Db, input: { ownerId: string; name: string; inviteToken: string; profile: MemberProfile }) {
  const groupId = crypto.randomUUID()
  const memberId = crypto.randomUUID()
  await db.tx(async (tx) => {
    await tx.query(`INSERT INTO groups (id, name, owner_user_id, invite_token) VALUES ($1, $2, $3, $4)`, [
      groupId,
      input.name,
      input.ownerId,
      input.inviteToken,
    ])
    await insertMember(tx, {
      id: memberId,
      groupId,
      userId: input.ownerId,
      profile: input.profile,
    })
  })
  return groupId
}

export async function insertMember(
  db: Db,
  input: { id?: string; groupId: string; userId: string | null; profile: MemberProfile },
) {
  const id = input.id ?? crypto.randomUUID()
  await db.query(
    `INSERT INTO group_members (
      id, group_id, user_id, display_name, is_goalkeeper, preferred_position, is_crack
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      id,
      input.groupId,
      input.userId,
      input.profile.displayName,
      input.profile.isGoalkeeper,
      input.profile.preferredPosition,
      input.profile.isCrack,
    ],
  )
  return id
}

export async function listGroups(db: Db, userId: string) {
  const rows = await db.query(
    `SELECT g.id, g.name, g.owner_user_id, g.created_at, m.display_name, m.elo, m.id AS member_id
     FROM groups g
     JOIN group_members m ON m.group_id = g.id AND m.user_id = $1
     ORDER BY g.created_at DESC`,
    [userId],
  )
  return rows.map((row) => ({
    id: String(row.id),
    name: String(row.name),
    ownerUserId: String(row.owner_user_id),
    isOwner: String(row.owner_user_id) === userId,
    createdAt: iso(row.created_at),
    displayName: String(row.display_name),
    elo: num(row, 'elo'),
    memberId: String(row.member_id),
  }))
}

export async function getMembership(db: Db, groupId: string, userId: string) {
  return db.one(
    `SELECT m.*, g.owner_user_id, g.name AS group_name, g.invite_token
     FROM group_members m
     JOIN groups g ON g.id = m.group_id
     WHERE m.group_id = $1 AND m.user_id = $2`,
    [groupId, userId],
  )
}

export async function requireMembership(db: Db, groupId: string, userId: string) {
  const membership = await getMembership(db, groupId, userId)
  if (!membership) throw new HttpError(404, 'Turno no encontrado')
  return membership
}

export async function getGroupByToken(db: Db, token: string) {
  return db.one<{ id: string; name: string; owner_user_id: string }>(
    `SELECT id, name, owner_user_id FROM groups WHERE invite_token = $1`,
    [token],
  )
}

export async function listMembers(db: Db, groupId: string) {
  const rows = await db.query(
    `SELECT * FROM group_members WHERE group_id = $1 ORDER BY display_name ASC`,
    [groupId],
  )
  return rows.map(mapMember)
}

export async function getMember(db: Db, groupId: string, memberId: string) {
  const row = await db.one(`SELECT * FROM group_members WHERE group_id = $1 AND id = $2`, [groupId, memberId])
  return row ? mapMember(row) : null
}

export async function updateMember(db: Db, groupId: string, memberId: string, profile: MemberProfile) {
  await db.query(
    `UPDATE group_members
     SET display_name = $1, is_goalkeeper = $2, preferred_position = $3, is_crack = $4
     WHERE group_id = $5 AND id = $6`,
    [profile.displayName, profile.isGoalkeeper, profile.preferredPosition, profile.isCrack, groupId, memberId],
  )
}

export async function claimGuest(db: Db, groupId: string, memberId: string, userId: string) {
  return db.tx(async (tx) => {
    const existing = await tx.one(`SELECT id FROM group_members WHERE group_id = $1 AND user_id = $2`, [groupId, userId])
    if (existing) return { alreadyMember: true as const }
    const claimed = await tx.one(
      `UPDATE group_members SET user_id = $1
       WHERE id = $2 AND group_id = $3 AND user_id IS NULL
       RETURNING id`,
      [userId, memberId, groupId],
    )
    if (!claimed) throw new HttpError(409, 'Esa ficha ya no está disponible')
    return { alreadyMember: false as const }
  })
}

export async function deleteMember(db: Db, groupId: string, memberId: string) {
  await db.tx(async (tx) => {
    await tx.query(`UPDATE matches SET mvp_member_id = NULL WHERE mvp_member_id = $1`, [memberId])
    await tx.query(`DELETE FROM match_players WHERE member_id = $1`, [memberId])
    await tx.query(`DELETE FROM group_members WHERE id = $1 AND group_id = $2`, [memberId, groupId])
    await recalculateGroup(tx, groupId)
  })
}

export async function renameGroup(db: Db, groupId: string, name: string) {
  await db.query(`UPDATE groups SET name = $1 WHERE id = $2`, [name, groupId])
}

export async function rotateInvite(db: Db, groupId: string, token: string) {
  await db.query(`UPDATE groups SET invite_token = $1 WHERE id = $2`, [token, groupId])
}

export async function deleteGroup(db: Db, groupId: string) {
  await db.tx(async (tx) => {
    await tx.query(`DELETE FROM match_players WHERE match_id IN (SELECT id FROM matches WHERE group_id = $1)`, [groupId])
    await tx.query(`DELETE FROM matches WHERE group_id = $1`, [groupId])
    await tx.query(`DELETE FROM group_members WHERE group_id = $1`, [groupId])
    await tx.query(`DELETE FROM groups WHERE id = $1`, [groupId])
  })
}

export type RosterInput = { memberId: string; team: 'A' | 'B'; goals: number }

export type MatchInput = {
  playedAt: string
  teamAScore: number
  teamBScore: number
  mvpMemberId: string | null
  notes: string | null
  roster: RosterInput[]
}

async function assertRoster(db: Db, groupId: string, input: MatchInput) {
  const members = await listMembers(db, groupId)
  const ids = new Set(members.map((member) => member.id))
  const seen = new Set<string>()
  for (const player of input.roster) {
    if (!ids.has(player.memberId)) throw new HttpError(400, 'Hay un jugador que no pertenece al turno')
    if (seen.has(player.memberId)) throw new HttpError(400, 'Un jugador no puede estar dos veces en el partido')
    seen.add(player.memberId)
  }
  const teams = new Set(input.roster.map((player) => player.team))
  if (!teams.has('A') || !teams.has('B')) throw new HttpError(400, 'El partido necesita jugadores en los dos equipos')
  if (input.mvpMemberId && !seen.has(input.mvpMemberId)) throw new HttpError(400, 'El MVP tiene que haber jugado el partido')
}

export async function saveMatch(db: Db, groupId: string, input: MatchInput, matchId?: string) {
  return db.tx(async (tx) => {
    await assertRoster(tx, groupId, input)
    const id = matchId ?? crypto.randomUUID()
    if (matchId) {
      const existing = await tx.one(`SELECT id FROM matches WHERE id = $1 AND group_id = $2`, [matchId, groupId])
      if (!existing) throw new HttpError(404, 'Partido no encontrado')
      await tx.query(
        `UPDATE matches
         SET played_at = $1, team_a_score = $2, team_b_score = $3, mvp_member_id = $4, notes = $5
         WHERE id = $6`,
        [input.playedAt, input.teamAScore, input.teamBScore, input.mvpMemberId, input.notes, id],
      )
      await tx.query(`DELETE FROM match_players WHERE match_id = $1`, [id])
    } else {
      await tx.query(
        `INSERT INTO matches (id, group_id, played_at, team_a_score, team_b_score, mvp_member_id, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [id, groupId, input.playedAt, input.teamAScore, input.teamBScore, input.mvpMemberId, input.notes],
      )
    }
    for (const player of input.roster) {
      await tx.query(
        `INSERT INTO match_players (id, match_id, member_id, team, goals) VALUES ($1, $2, $3, $4, $5)`,
        [crypto.randomUUID(), id, player.memberId, player.team, player.goals],
      )
    }
    await recalculateGroup(tx, groupId)
    return id
  })
}

export async function deleteMatch(db: Db, groupId: string, matchId: string) {
  await db.tx(async (tx) => {
    const existing = await tx.one(`SELECT id FROM matches WHERE id = $1 AND group_id = $2`, [matchId, groupId])
    if (!existing) throw new HttpError(404, 'Partido no encontrado')
    await tx.query(`DELETE FROM match_players WHERE match_id = $1`, [matchId])
    await tx.query(`DELETE FROM matches WHERE id = $1`, [matchId])
    await recalculateGroup(tx, groupId)
  })
}

export async function listMatches(db: Db, groupId: string) {
  const matches = await db.query(
    `SELECT * FROM matches WHERE group_id = $1 ORDER BY played_at DESC, id DESC`,
    [groupId],
  )
  const players = await db.query(
    `SELECT mp.*, m.display_name, m.user_id
     FROM match_players mp
     JOIN group_members m ON m.id = mp.member_id
     WHERE mp.match_id IN (SELECT id FROM matches WHERE group_id = $1)
     ORDER BY mp.team ASC, mp.goals DESC, m.display_name ASC`,
    [groupId],
  )
  const byMatch = new Map<string, Row[]>()
  for (const player of players) {
    const key = String(player.match_id)
    const list = byMatch.get(key) ?? []
    list.push(player)
    byMatch.set(key, list)
  }
  const members = await listMembers(db, groupId)
  const names = new Map(members.map((member) => [member.id, member.displayName]))

  return matches.map((match) => ({
    id: String(match.id),
    playedAt: iso(match.played_at),
    teamAScore: num(match, 'team_a_score'),
    teamBScore: num(match, 'team_b_score'),
    mvpMemberId: text(match, 'mvp_member_id'),
    mvpName: text(match, 'mvp_member_id') ? names.get(String(match.mvp_member_id)) ?? null : null,
    notes: text(match, 'notes'),
    roster: (byMatch.get(String(match.id)) ?? []).map((player) => ({
      id: String(player.id),
      memberId: String(player.member_id),
      displayName: String(player.display_name),
      team: String(player.team),
      goals: num(player, 'goals'),
      eloChange: num(player, 'elo_change'),
      isGuest: player.user_id == null,
    })),
  }))
}

export async function recalculateGroup(db: Db, groupId: string) {
  const members = await db.query<{ id: string }>(`SELECT id FROM group_members WHERE group_id = $1`, [groupId])
  const matches = await db.query(
    `SELECT id, played_at, team_a_score, team_b_score, mvp_member_id FROM matches WHERE group_id = $1`,
    [groupId],
  )
  const roster = await db.query(
    `SELECT mp.id, mp.match_id, mp.member_id, mp.team, mp.goals
     FROM match_players mp
     JOIN matches m ON m.id = mp.match_id
     WHERE m.group_id = $1`,
    [groupId],
  )
  const result = recalculateElo(
    members.map((member) => ({ id: member.id })),
    matches.map((match) => ({
      id: String(match.id),
      playedAt: iso(match.played_at),
      teamAScore: num(match, 'team_a_score'),
      teamBScore: num(match, 'team_b_score'),
      mvpMemberId: text(match, 'mvp_member_id'),
    })),
    roster.map((player) => ({
      id: String(player.id),
      matchId: String(player.match_id),
      memberId: String(player.member_id),
      team: String(player.team) === 'B' ? 'B' : 'A',
      goals: num(player, 'goals'),
    })),
  )
  for (const member of result.members) {
    await db.query(
      `UPDATE group_members
       SET elo = $1, wins = $2, draws = $3, losses = $4, goals = $5, mvps = $6
       WHERE id = $7`,
      [member.elo, member.wins, member.draws, member.losses, member.goals, member.mvps, member.id],
    )
  }
  for (const change of result.eloChanges) {
    await db.query(`UPDATE match_players SET elo_change = $1 WHERE id = $2`, [change.eloChange, change.id])
  }
}

export async function groupDetail(db: Db, groupId: string, userId: string, publicAppUrl: string) {
  const membership = await requireMembership(db, groupId, userId)
  const [members, matches] = await Promise.all([listMembers(db, groupId), listMatches(db, groupId)])
  return {
    group: {
      id: groupId,
      name: String(membership.group_name),
      ownerUserId: String(membership.owner_user_id),
      isOwner: String(membership.owner_user_id) === userId,
      inviteToken: String(membership.invite_token),
      inviteUrl: `${publicAppUrl.replace(/\/$/, '')}/j/${membership.invite_token}`,
    },
    meMemberId: String(membership.id),
    members,
    matches,
  }
}
