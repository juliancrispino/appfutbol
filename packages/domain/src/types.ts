export type PositionType = 'goalkeeper' | 'defender' | 'midfielder' | 'forward'

export type RankedPlayer = {
  id: string
  name: string
  elo: number
  wins: number
  draws: number
  losses: number
  goals: number
  mvps: number
}

export type BalancePlayer = RankedPlayer & {
  isGoalkeeper: boolean
  preferredPosition: PositionType
  isCrack: boolean
}

export type EloMember = {
  id: string
}

export type EloMatch = {
  id: string
  playedAt: string
  teamAScore: number
  teamBScore: number
  mvpMemberId: string | null
}

export type EloRosterEntry = {
  id: string
  matchId: string
  memberId: string
  team: 'A' | 'B'
  goals: number
}

export type MemberStats = {
  id: string
  elo: number
  wins: number
  draws: number
  losses: number
  goals: number
  mvps: number
}

export type EloChange = {
  id: string
  eloChange: number
}
