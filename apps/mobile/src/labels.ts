import type { Position } from './types'

export const POSITIONS: { id: Position; label: string; short: string }[] = [
  { id: 'goalkeeper', label: 'Arquero', short: 'ARQ' },
  { id: 'defender', label: 'Defensor', short: 'DEF' },
  { id: 'midfielder', label: 'Mediocampista', short: 'MED' },
  { id: 'forward', label: 'Delantero', short: 'DEL' },
]

export function positionLabel(position: string) {
  return POSITIONS.find((item) => item.id === position)?.label ?? position
}

export function positionShort(position: string) {
  return POSITIONS.find((item) => item.id === position)?.short ?? position
}
