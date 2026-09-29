import { balanceTeams } from '@turnos/domain'
import { router } from 'expo-router'
import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { AdBanner } from '@/ads'
import { setMatchDraft } from '@/draft'
import { useGroup } from '@/group'
import { colors } from '@/theme'
import { Button, Muted, Screen } from '@/ui'

export default function TeamsScreen() {
  const { detail } = useGroup()
  const [selected, setSelected] = useState<string[]>([])
  const [note, setNote] = useState<string | null>(null)
  const [teams, setTeams] = useState<{ teamA: string[]; teamB: string[] } | null>(null)
  const members = detail?.members ?? []

  function toggle(id: string) {
    setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]))
  }

  function balance() {
    const chosen = members.filter((member) => selected.includes(member.id))
    const result = balanceTeams(
      chosen.map((member) => ({
        ...member,
        name: member.displayName,
      })),
    )
    setTeams({ teamA: result.teamA.map((player) => player.id), teamB: result.teamB.map((player) => player.id) })
    setNote(result.note ?? null)
  }

  function useTeams() {
    if (!detail || !teams) return
    setMatchDraft({ groupId: detail.group.id, ...teams })
    router.push(`/g/${detail.group.id}/match/new`)
  }

  const name = (id: string) => members.find((member) => member.id === id)?.displayName ?? id

  return (
    <Screen>
      <Muted>Elegí quién está y armamos dos equipos parejos por Elo, arqueros, cracks y posiciones.</Muted>
      {members.map((member) => {
        const on = selected.includes(member.id)
        return (
          <Pressable key={member.id} onPress={() => toggle(member.id)} style={[styles.row, on && styles.rowOn]}>
            <Text style={styles.name}>{member.displayName}</Text>
            <Text style={styles.meta}>Elo {member.elo}</Text>
          </Pressable>
        )
      })}
      <Button label="Armar equipos" onPress={balance} disabled={selected.length < 2} />
      {note ? <Muted>{note}</Muted> : null}
      {teams ? (
        <View style={styles.columns}>
          <Team title="Equipo A" names={teams.teamA.map(name)} />
          <Team title="Equipo B" names={teams.teamB.map(name)} />
        </View>
      ) : null}
      {teams ? <Button label="Cargar el partido con estos equipos" onPress={useTeams} /> : null}
      <AdBanner />
    </Screen>
  )
}

function Team({ title, names }: { title: string; names: string[] }) {
  return (
    <View style={styles.team}>
      <Text style={styles.teamTitle}>{title}</Text>
      {names.map((item) => (
        <Text key={item} style={styles.name}>
          {item}
        </Text>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
  },
  rowOn: { borderColor: colors.emerald },
  name: { color: colors.text, fontWeight: '700' },
  meta: { color: colors.muted },
  columns: { flexDirection: 'row', gap: 8 },
  team: { flex: 1, backgroundColor: colors.card, borderRadius: 14, padding: 12, gap: 6 },
  teamTitle: { color: colors.emerald, fontWeight: '800' },
})
