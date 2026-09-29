import type { RankedPlayer } from './types'

export function comparePlayersByElo(a: RankedPlayer, b: RankedPlayer) {
  if (b.elo !== a.elo) return b.elo - a.elo
  if (b.mvps !== a.mvps) return b.mvps - a.mvps
  if (b.goals !== a.goals) return b.goals - a.goals
  if (b.wins !== a.wins) return b.wins - a.wins
  return a.name.localeCompare(b.name, 'es')
}

export function comparePlayersByGoals(a: RankedPlayer, b: RankedPlayer) {
  if (b.goals !== a.goals) return b.goals - a.goals
  if (b.mvps !== a.mvps) return b.mvps - a.mvps
  if (b.elo !== a.elo) return b.elo - a.elo
  if (b.wins !== a.wins) return b.wins - a.wins
  return a.name.localeCompare(b.name, 'es')
}

export function comparePlayersByMvps(a: RankedPlayer, b: RankedPlayer) {
  if (b.mvps !== a.mvps) return b.mvps - a.mvps
  if (b.goals !== a.goals) return b.goals - a.goals
  if (b.elo !== a.elo) return b.elo - a.elo
  if (b.wins !== a.wins) return b.wins - a.wins
  return a.name.localeCompare(b.name, 'es')
}
