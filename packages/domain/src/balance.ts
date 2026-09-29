import { comparePlayersByElo } from './ranking'
import type { BalancePlayer } from './types'

export function balanceTeams(selectedPlayers: BalancePlayer[]): {
  teamA: BalancePlayer[]
  teamB: BalancePlayer[]
  note?: string
} {
  const n = selectedPlayers.length
  if (n < 2) return { teamA: selectedPlayers, teamB: [] }

  const k = Math.floor(n / 2)
  const allCombos: number[][] = []

  function getCombos(start: number, curr: number[]) {
    if (curr.length === k) {
      allCombos.push([...curr])
      return
    }
    for (let i = start; i < n; i++) {
      curr.push(i)
      getCombos(i + 1, curr)
      curr.pop()
    }
  }
  getCombos(0, [])

  const sortedByElo = [...selectedPlayers].sort(comparePlayersByElo)
  const bestPlayer = sortedByElo[0]
  const secondBestPlayer = sortedByElo[1]
  const fixedGoalkeepers = selectedPlayers.filter((player) => player.isGoalkeeper)
  const nonGkPlayersSorted = sortedByElo.filter((player) => !player.isGoalkeeper)
  const targetAdvantagePlayer = nonGkPlayersSorted[0] || bestPlayer

  let bestScore = Infinity
  let bestComboIndices: number[] = allCombos[0] || []
  let reasonNote = ''

  for (const combo of allCombos) {
    const setA = new Set(combo)
    const teamA = combo.map((idx) => selectedPlayers[idx])
    const teamB = selectedPlayers.filter((_, idx) => !setA.has(idx))
    let penalty = 0

    const gkA = teamA.filter((player) => player.isGoalkeeper)
    const gkB = teamB.filter((player) => player.isGoalkeeper)

    if (fixedGoalkeepers.length >= 2) {
      if (gkA.length < 1 || gkB.length < 1) penalty += 1_000_000
    } else if (fixedGoalkeepers.length === 1) {
      const teamWithoutGkIsA = gkA.length === 0
      const advantagePlayerInA = teamA.some((player) => player.id === targetAdvantagePlayer.id)
      if (teamWithoutGkIsA !== advantagePlayerInA) penalty += 500_000
    }

    const cracksA = teamA.filter((player) => player.isCrack)
    const cracksB = teamB.filter((player) => player.isCrack)
    const totalCracks = cracksA.length + cracksB.length

    if (totalCracks > 0) {
      const diff = Math.abs(cracksA.length - cracksB.length)
      if (totalCracks === 2 && diff > 0) {
        penalty += 800_000
      } else {
        penalty += diff * 400_000
        if (diff === 1 && fixedGoalkeepers.length !== 1) {
          const teamWithLessCracksIsA = cracksA.length < cracksB.length
          const advantagePlayerInA = teamA.some((player) => player.id === targetAdvantagePlayer.id)
          if (teamWithLessCracksIsA !== advantagePlayerInA) penalty += 200_000
        }
      }
    }

    const avgA = teamA.reduce((sum, player) => sum + player.elo, 0) / teamA.length
    const avgB = teamB.reduce((sum, player) => sum + player.elo, 0) / teamB.length
    penalty += Math.abs(avgA - avgB) * 100

    if (fixedGoalkeepers.length !== 1 && secondBestPlayer) {
      const top1InA = teamA.some((player) => player.id === bestPlayer.id)
      const top2InA = teamA.some((player) => player.id === secondBestPlayer.id)
      if (top1InA === top2InA) penalty += 250
    }

    const count = (team: BalancePlayer[], position: BalancePlayer['preferredPosition']) =>
      team.filter((player) => player.preferredPosition === position).length

    penalty += Math.abs(count(teamA, 'defender') - count(teamB, 'defender')) * 8
    penalty += Math.abs(count(teamA, 'forward') - count(teamB, 'forward')) * 8
    penalty += Math.abs(count(teamA, 'midfielder') - count(teamB, 'midfielder')) * 2

    if (penalty < bestScore) {
      bestScore = penalty
      bestComboIndices = combo
    }
  }

  const setChosen = new Set(bestComboIndices)
  const finalTeamA = bestComboIndices.map((idx) => selectedPlayers[idx])
  const finalTeamB = selectedPlayers.filter((_, idx) => !setChosen.has(idx))

  if (fixedGoalkeepers.length >= 2) {
    reasonNote = 'Arqueros fijos repartidos, cracks balanceados, promedio de ELO equilibrado y posiciones balanceadas.'
  } else if (fixedGoalkeepers.length === 1) {
    reasonNote = `1 arquero fijo presente. ${targetAdvantagePlayer.name} (#1 de campo) fue asignado al equipo rival para emparejar. Cracks y posiciones balanceados.`
  } else {
    reasonNote = 'Equipos optimizados por balance de cracks, promedio de ELO y reparto de posiciones.'
  }

  return { teamA: finalTeamA, teamB: finalTeamB, note: reasonNote }
}
