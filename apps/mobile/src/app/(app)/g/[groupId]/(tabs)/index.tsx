import { comparePlayersByElo, comparePlayersByGoals, comparePlayersByMvps } from '@turnos/domain'
import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { AdBanner } from '@/ads'
import { useGroup } from '@/group'
import { positionShort } from '@/labels'
import { colors } from '@/theme'
import type { Member } from '@/types'
import { Card, ErrorText, Muted, Screen } from '@/ui'

type Mode = 'elo' | 'goals' | 'mvps'

const modes: { id: Mode; label: string }[] = [
  { id: 'elo', label: 'Elo' },
  { id: 'goals', label: 'Goles' },
  { id: 'mvps', label: 'MVP' },
]

export default function RankingScreen() {
  const { detail, loading, error } = useGroup()
  const [mode, setMode] = useState<Mode>('elo')
  const members = [...(detail?.members ?? [])].sort((a, b) => {
    const left = { ...a, name: a.displayName }
    const right = { ...b, name: b.displayName }
    if (mode === 'goals') return comparePlayersByGoals(left, right)
    if (mode === 'mvps') return comparePlayersByMvps(left, right)
    return comparePlayersByElo(left, right)
  })

  return (
    <Screen>
      <View style={styles.modes}>
        {modes.map((item) => (
          <Pressable key={item.id} onPress={() => setMode(item.id)} style={[styles.mode, mode === item.id && styles.modeOn]}>
            <Text style={[styles.modeText, mode === item.id && styles.modeTextOn]}>{item.label}</Text>
          </Pressable>
        ))}
      </View>
      {loading ? <Muted>Cargando ranking...</Muted> : null}
      <ErrorText>{error}</ErrorText>
      {members.slice(0, 3).map((member, index) => (
        <Card key={member.id}>
          <Text style={styles.podium}>
            {index + 1}. {member.displayName}
          </Text>
          <StatLine member={member} />
        </Card>
      ))}
      {members.slice(3).map((member, index) => (
        <View key={member.id} style={styles.row}>
          <Text style={styles.rank}>{index + 4}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{member.displayName}</Text>
            <StatLine member={member} />
          </View>
        </View>
      ))}
      <AdBanner />
    </Screen>
  )
}

function StatLine({ member }: { member: Member }) {
  const played = member.wins + member.draws + member.losses
  return (
    <Text style={styles.meta}>
      Elo {member.elo} · {played} PJ · {member.goals} goles · {member.mvps} MVP · {positionShort(member.preferredPosition)}
      {member.isGuest ? ' · Invitado' : ''}
      {member.isCrack ? ' · Crack' : ''}
    </Text>
  )
}

const styles = StyleSheet.create({
  modes: { flexDirection: 'row', gap: 8 },
  mode: { borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  modeOn: { backgroundColor: colors.emerald, borderColor: colors.emerald },
  modeText: { color: colors.text, fontWeight: '700' },
  modeTextOn: { color: colors.emeraldText },
  podium: { color: colors.text, fontSize: 18, fontWeight: '800' },
  row: { flexDirection: 'row', gap: 12, alignItems: 'center', paddingVertical: 8 },
  rank: { color: colors.muted, width: 24, fontWeight: '800' },
  name: { color: colors.text, fontWeight: '700', fontSize: 16 },
  meta: { color: colors.muted, fontSize: 13 },
})
