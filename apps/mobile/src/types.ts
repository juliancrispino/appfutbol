export type Position = 'goalkeeper' | 'defender' | 'midfielder' | 'forward'

export type Member = {
  id: string
  groupId: string
  userId: string | null
  displayName: string
  isGoalkeeper: boolean
  preferredPosition: Position
  isCrack: boolean
  elo: number
  wins: number
  draws: number
  losses: number
  goals: number
  mvps: number
  isGuest: boolean
}

export type RosterPlayer = {
  id: string
  memberId: string
  displayName: string
  team: 'A' | 'B'
  goals: number
  eloChange: number
  isGuest: boolean
}

export type Match = {
  id: string
  playedAt: string
  teamAScore: number
  teamBScore: number
  mvpMemberId: string | null
  mvpName: string | null
  notes: string | null
  roster: RosterPlayer[]
}

export type GroupDetail = {
  group: {
    id: string
    name: string
    ownerUserId: string
    isOwner: boolean
    inviteToken: string
    inviteUrl: string
  }
  meMemberId: string
  members: Member[]
  matches: Match[]
}

export type GroupSummary = {
  id: string
  name: string
  isOwner: boolean
  displayName: string
  elo: number
  memberId: string
}

export type ProfileInput = {
  displayName: string
  preferredPosition: Position
  isGoalkeeper: boolean
  isCrack: boolean
}

export type SessionUser = {
  id: string
  email: string
  name: string
}

export type Session = {
  accessToken: string
  refreshToken: string
  user: SessionUser
}
