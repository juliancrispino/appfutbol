import type { EloChange, EloMatch, EloMember, EloRosterEntry, MemberStats } from './types'

const K = 32

/**
 * Recalcula Elo y estadísticas de un turno en orden cronológico.
 * Todas las fichas suman, tengan o no cuenta. El Elo inicial es 1000.
 */
export function recalculateElo(
  members: EloMember[],
  matches: EloMatch[],
  roster: EloRosterEntry[],
): { members: MemberStats[]; eloChanges: EloChange[] } {
  const stats = new Map<string, MemberStats>()
  for (const member of members) {
    stats.set(member.id, {
      id: member.id,
      elo: 1000,
      wins: 0,
      draws: 0,
      losses: 0,
      goals: 0,
      mvps: 0,
    })
  }

  const rosterByMatch = new Map<string, EloRosterEntry[]>()
  for (const entry of roster) {
    const list = rosterByMatch.get(entry.matchId) ?? []
    list.push(entry)
    rosterByMatch.set(entry.matchId, list)
  }

  const ordered = [...matches].sort((a, b) => {
    if (a.playedAt !== b.playedAt) return a.playedAt < b.playedAt ? -1 : 1
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
  })

  const eloChanges: EloChange[] = []

  for (const match of ordered) {
    const players = rosterByMatch.get(match.id) ?? []
    for (const player of players) {
      const stat = stats.get(player.memberId)
      if (stat) stat.goals += Number(player.goals || 0)
    }

    if (match.mvpMemberId && stats.has(match.mvpMemberId)) {
      stats.get(match.mvpMemberId)!.mvps += 1
    }

    const teamA = players.filter((player) => player.team === 'A')
    const teamB = players.filter((player) => player.team === 'B')
    if (teamA.length === 0 || teamB.length === 0) continue

    const avgEloA = teamA.reduce((sum, player) => sum + (stats.get(player.memberId)?.elo ?? 1000), 0) / teamA.length
    const avgEloB = teamB.reduce((sum, player) => sum + (stats.get(player.memberId)?.elo ?? 1000), 0) / teamB.length
    const expectedA = 1 / (1 + Math.pow(10, (avgEloB - avgEloA) / 400))
    const scoreA = Number(match.teamAScore)
    const scoreB = Number(match.teamBScore)

    let actualA = 0.5
    if (scoreA > scoreB) actualA = 1
    else if (scoreA < scoreB) actualA = 0

    const goalDiff = Math.abs(scoreA - scoreB)
    const marginFactor = goalDiff > 1 ? Math.min(2, 1 + (goalDiff - 1) * 0.15) : 1
    const deltaEloA = Math.round(K * marginFactor * (actualA - expectedA))
    const deltaEloB = -deltaEloA

    for (const player of teamA) {
      eloChanges.push({ id: player.id, eloChange: deltaEloA })
      const stat = stats.get(player.memberId)
      if (!stat) continue
      stat.elo += deltaEloA
      if (scoreA > scoreB) stat.wins += 1
      else if (scoreA < scoreB) stat.losses += 1
      else stat.draws += 1
    }

    for (const player of teamB) {
      eloChanges.push({ id: player.id, eloChange: deltaEloB })
      const stat = stats.get(player.memberId)
      if (!stat) continue
      stat.elo += deltaEloB
      if (scoreB > scoreA) stat.wins += 1
      else if (scoreB < scoreA) stat.losses += 1
      else stat.draws += 1
    }
  }

  return { members: [...stats.values()], eloChanges }
}
