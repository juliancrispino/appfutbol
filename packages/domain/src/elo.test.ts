import assert from 'node:assert/strict'
import test from 'node:test'
import { recalculateElo } from './elo'

test('una victoria ajustada mueve 16 puntos de Elo desde 1000', () => {
  const result = recalculateElo(
    [{ id: 'a' }, { id: 'b' }],
    [{ id: 'm1', playedAt: '2026-01-01T15:00:00.000Z', teamAScore: 2, teamBScore: 1, mvpMemberId: 'a' }],
    [
      { id: 'r1', matchId: 'm1', memberId: 'a', team: 'A', goals: 2 },
      { id: 'r2', matchId: 'm1', memberId: 'b', team: 'B', goals: 1 },
    ],
  )

  const ana = result.members.find((member) => member.id === 'a')!
  const beto = result.members.find((member) => member.id === 'b')!
  assert.equal(ana.elo, 1016)
  assert.equal(ana.wins, 1)
  assert.equal(ana.goals, 2)
  assert.equal(ana.mvps, 1)
  assert.equal(beto.elo, 984)
  assert.equal(beto.losses, 1)
  assert.equal(beto.goals, 1)
  assert.equal(beto.mvps, 0)
  assert.deepEqual(result.eloChanges, [
    { id: 'r1', eloChange: 16 },
    { id: 'r2', eloChange: -16 },
  ])
})

test('una goleada agranda el margen y el orden cronológico encadena el Elo', () => {
  const result = recalculateElo(
    [{ id: 'a' }, { id: 'b' }],
    [
      { id: 'm2', playedAt: '2026-02-01T15:00:00.000Z', teamAScore: 1, teamBScore: 1, mvpMemberId: null },
      { id: 'm1', playedAt: '2026-01-01T15:00:00.000Z', teamAScore: 5, teamBScore: 0, mvpMemberId: null },
    ],
    [
      { id: 'r1', matchId: 'm1', memberId: 'a', team: 'A', goals: 3 },
      { id: 'r2', matchId: 'm1', memberId: 'b', team: 'B', goals: 0 },
      { id: 'r3', matchId: 'm2', memberId: 'a', team: 'A', goals: 1 },
      { id: 'r4', matchId: 'm2', memberId: 'b', team: 'B', goals: 1 },
    ],
  )

  const ana = result.members.find((member) => member.id === 'a')!
  const beto = result.members.find((member) => member.id === 'b')!
  assert.equal(ana.wins, 1)
  assert.equal(ana.draws, 1)
  assert.equal(ana.goals, 4)
  assert.equal(result.eloChanges.find((change) => change.id === 'r1')?.eloChange, 26)
  assert.equal(ana.elo, 1024)
  assert.equal(beto.elo, 976)
  assert.equal(result.eloChanges.find((change) => change.id === 'r3')?.eloChange, -2)
})

test('una ficha sin cuenta suma Elo igual que el resto', () => {
  const result = recalculateElo(
    [{ id: 'guest' }, { id: 'user' }],
    [{ id: 'm1', playedAt: '2026-01-01', teamAScore: 0, teamBScore: 1, mvpMemberId: 'guest' }],
    [
      { id: 'r1', matchId: 'm1', memberId: 'guest', team: 'A', goals: 0 },
      { id: 'r2', matchId: 'm1', memberId: 'user', team: 'B', goals: 1 },
    ],
  )
  const guest = result.members.find((member) => member.id === 'guest')!
  assert.equal(guest.elo, 984)
  assert.equal(guest.losses, 1)
  assert.equal(guest.mvps, 1)
})
