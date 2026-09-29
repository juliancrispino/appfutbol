import assert from 'node:assert/strict'
import test from 'node:test'
import { balanceTeams } from './balance'
import type { BalancePlayer } from './types'

function player(partial: Partial<BalancePlayer> & Pick<BalancePlayer, 'id' | 'name' | 'elo'>): BalancePlayer {
  return {
    wins: 0,
    draws: 0,
    losses: 0,
    goals: 0,
    mvps: 0,
    isGoalkeeper: false,
    preferredPosition: 'midfielder',
    isCrack: false,
    ...partial,
  }
}

test('reparte dos arqueros y dos cracks en lados distintos', () => {
  const players = [
    player({ id: 'gk1', name: 'Arquero 1', elo: 1100, isGoalkeeper: true, preferredPosition: 'goalkeeper' }),
    player({ id: 'gk2', name: 'Arquero 2', elo: 1050, isGoalkeeper: true, preferredPosition: 'goalkeeper' }),
    player({ id: 'c1', name: 'Crack 1', elo: 1400, isCrack: true, preferredPosition: 'forward' }),
    player({ id: 'c2', name: 'Crack 2', elo: 1300, isCrack: true, preferredPosition: 'forward' }),
    player({ id: 'm1', name: 'Medio 1', elo: 1000 }),
    player({ id: 'm2', name: 'Medio 2', elo: 990 }),
  ]

  const result = balanceTeams(players)
  const ids = [...result.teamA, ...result.teamB].map((item) => item.id).sort()
  assert.deepEqual(ids, players.map((item) => item.id).sort())
  assert.equal(result.teamA.some((item) => item.isGoalkeeper), true)
  assert.equal(result.teamB.some((item) => item.isGoalkeeper), true)
  assert.equal(result.teamA.filter((item) => item.isCrack).length, 1)
  assert.equal(result.teamB.filter((item) => item.isCrack).length, 1)
})

test('con un solo arquero, el mejor de campo queda en el otro equipo', () => {
  const players = [
    player({ id: 'gk', name: 'Arquero', elo: 1000, isGoalkeeper: true, preferredPosition: 'goalkeeper' }),
    player({ id: 'best', name: 'Mejor', elo: 1500, preferredPosition: 'forward' }),
    player({ id: 'p3', name: 'Tres', elo: 1100, preferredPosition: 'defender' }),
    player({ id: 'p4', name: 'Cuatro', elo: 1090, preferredPosition: 'defender' }),
  ]
  const result = balanceTeams(players)
  const gkTeam = result.teamA.some((item) => item.id === 'gk') ? result.teamA : result.teamB
  const other = gkTeam === result.teamA ? result.teamB : result.teamA
  assert.equal(gkTeam.some((item) => item.id === 'best'), false)
  assert.equal(other.some((item) => item.id === 'best'), true)
  assert.match(result.note ?? '', /Mejor/)
})
