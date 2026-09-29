import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { api, ApiError } from './api'
import { colors } from './theme'
import type { GroupDetail, Match } from './types'
import { Button, ErrorText, Field } from './ui'

type Side = 'A' | 'B' | null

export function MatchForm({
  detail,
  match,
  initialTeams,
  onSaved,
}: {
  detail: GroupDetail
  match?: Match
  initialTeams?: { teamA: string[]; teamB: string[] } | null
  onSaved: () => void
}) {
  const [date, setDate] = useState(match ? match.playedAt.slice(0, 10) : new Date().toISOString().slice(0, 10))
  const [scoreA, setScoreA] = useState(String(match?.teamAScore ?? 0))
  const [scoreB, setScoreB] = useState(String(match?.teamBScore ?? 0))
  const [notes, setNotes] = useState(match?.notes ?? '')
  const [mvp, setMvp] = useState<string | null>(match?.mvpMemberId ?? null)
  const [sides, setSides] = useState<Record<string, Side>>(() => {
    const next: Record<string, Side> = {}
    for (const member of detail.members) next[member.id] = null
    if (match) {
      for (const player of match.roster) next[player.memberId] = player.team
    } else if (initialTeams) {
      for (const id of initialTeams.teamA) next[id] = 'A'
      for (const id of initialTeams.teamB) next[id] = 'B'
    }
    return next
  })
  const [goals, setGoals] = useState<Record<string, number>>(() => {
    const next: Record<string, number> = {}
    for (const player of match?.roster ?? []) next[player.memberId] = player.goals
    return next
  })
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const playing = detail.members.filter((member) => sides[member.id])

  async function save() {
    setError(null)
    const roster = detail.members
      .filter((member) => sides[member.id])
      .map((member) => ({
        memberId: member.id,
        team: sides[member.id] as 'A' | 'B',
        goals: goals[member.id] ?? 0,
      }))
    setSaving(true)
    try {
      const body = {
        playedAt: date,
        teamAScore: Number(scoreA || 0),
        teamBScore: Number(scoreB || 0),
        mvpMemberId: mvp,
        notes,
        roster,
      }
      if (match) await api(`/api/groups/${detail.group.id}/matches/${match.id}`, { method: 'PATCH', body })
      else await api(`/api/groups/${detail.group.id}/matches`, { body })
      onSaved()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo guardar el partido')
    } finally {
      setSaving(false)
    }
  }

  return (
    <View style={styles.wrap}>
      <Field label="Fecha" value={date} onChangeText={setDate} placeholder="AAAA-MM-DD" />
      <View style={styles.scores}>
        <View style={styles.score}>
          <Field label="Equipo A" value={scoreA} onChangeText={setScoreA} keyboard="numeric" />
        </View>
        <View style={styles.score}>
          <Field label="Equipo B" value={scoreB} onChangeText={setScoreB} keyboard="numeric" />
        </View>
      </View>
      {detail.members.map((member) => {
        const side = sides[member.id]
        return (
          <View key={member.id} style={styles.player}>
            <Text style={styles.name}>{member.displayName}</Text>
            <View style={styles.row}>
              {(['A', 'B'] as const).map((team) => (
                <Pressable
                  key={team}
                  onPress={() => {
                    const next = side === team ? null : team
                    setSides({ ...sides, [member.id]: next })
                    if (!next && mvp === member.id) setMvp(null)
                  }}
                  style={[styles.chip, side === team && styles.chipOn]}
                >
                  <Text style={[styles.chipText, side === team && styles.chipTextOn]}>{team}</Text>
                </Pressable>
              ))}
              {side ? (
                <View style={styles.goals}>
                  <Pressable onPress={() => setGoals({ ...goals, [member.id]: Math.max(0, (goals[member.id] ?? 0) - 1) })}>
                    <Text style={styles.goalBtn}>−</Text>
                  </Pressable>
                  <Text style={styles.goalCount}>{goals[member.id] ?? 0}</Text>
                  <Pressable onPress={() => setGoals({ ...goals, [member.id]: (goals[member.id] ?? 0) + 1 })}>
                    <Text style={styles.goalBtn}>+</Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
          </View>
        )
      })}
      <Text style={styles.label}>MVP</Text>
      <View style={styles.rowWrap}>
        <Pressable onPress={() => setMvp(null)} style={[styles.chip, mvp == null && styles.chipOn]}>
          <Text style={[styles.chipText, mvp == null && styles.chipTextOn]}>Sin MVP</Text>
        </Pressable>
        {playing.map((member) => (
          <Pressable key={member.id} onPress={() => setMvp(member.id)} style={[styles.chip, mvp === member.id && styles.chipOn]}>
            <Text style={[styles.chipText, mvp === member.id && styles.chipTextOn]}>{member.displayName}</Text>
          </Pressable>
        ))}
      </View>
      <Field label="Notas" value={notes} onChangeText={setNotes} multiline placeholder="Cancha, horario, lo que quieran recordar" />
      <ErrorText>{error}</ErrorText>
      <Button label={saving ? 'Guardando...' : 'Guardar partido'} onPress={save} disabled={saving} />
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  scores: { flexDirection: 'row', gap: 12 },
  score: { flex: 1 },
  player: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    gap: 8,
  },
  name: { color: colors.text, fontWeight: '700', fontSize: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipOn: { backgroundColor: colors.emerald, borderColor: colors.emerald },
  chipText: { color: colors.text, fontWeight: '700' },
  chipTextOn: { color: colors.emeraldText },
  goals: { flexDirection: 'row', alignItems: 'center', gap: 10, marginLeft: 'auto' },
  goalBtn: { color: colors.emerald, fontSize: 22, fontWeight: '800', paddingHorizontal: 6 },
  goalCount: { color: colors.text, fontSize: 16, fontWeight: '700', minWidth: 16, textAlign: 'center' },
  label: { color: colors.muted, fontSize: 13, fontWeight: '600' },
})
