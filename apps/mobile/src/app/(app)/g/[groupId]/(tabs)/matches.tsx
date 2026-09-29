import { router } from 'expo-router'
import { useState } from 'react'
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native'
import { AdBanner } from '@/ads'
import { api, ApiError } from '@/api'
import { useGroup } from '@/group'
import { colors } from '@/theme'
import { Button, ErrorText, Muted, Screen } from '@/ui'

export default function MatchesScreen() {
  const { detail, refresh } = useGroup()
  const [open, setOpen] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  function remove(matchId: string) {
    if (!detail) return
    Alert.alert('Borrar partido', 'Se recalcula el Elo de todo el turno.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Borrar',
        style: 'destructive',
        onPress: async () => {
          try {
            await api(`/api/groups/${detail.group.id}/matches/${matchId}`, { method: 'DELETE' })
            await refresh()
          } catch (err) {
            setError(err instanceof ApiError ? err.message : 'No se pudo borrar')
          }
        },
      },
    ])
  }

  return (
    <Screen>
      <Button label="Cargar partido" onPress={() => router.push(`/g/${detail?.group.id}/match/new`)} />
      {(detail?.matches ?? []).map((match) => {
        const expanded = open === match.id
        return (
          <Pressable key={match.id} onPress={() => setOpen(expanded ? null : match.id)} style={styles.card}>
            <Text style={styles.score}>
              {match.teamAScore} - {match.teamBScore}
            </Text>
            <Text style={styles.meta}>{new Date(match.playedAt).toLocaleDateString('es-AR')}</Text>
            {match.mvpName ? <Text style={styles.meta}>MVP {match.mvpName}</Text> : null}
            {expanded ? (
              <View style={styles.roster}>
                {match.roster.map((player) => (
                  <Text key={player.id} style={styles.meta}>
                    {player.team} · {player.displayName} · {player.goals} goles · {player.eloChange > 0 ? '+' : ''}
                    {player.eloChange}
                  </Text>
                ))}
                {match.notes ? <Text style={styles.meta}>{match.notes}</Text> : null}
                <Button label="Editar" tone="ghost" onPress={() => router.push(`/g/${detail?.group.id}/match/${match.id}`)} />
                <Button label="Borrar" tone="danger" onPress={() => remove(match.id)} />
              </View>
            ) : null}
          </Pressable>
        )
      })}
      {detail && detail.matches.length === 0 ? <Muted>Cuando carguen el primer partido, el ranking se arma solo.</Muted> : null}
      <ErrorText>{error}</ErrorText>
      <AdBanner />
    </Screen>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 4,
  },
  score: { color: colors.text, fontSize: 24, fontWeight: '800' },
  meta: { color: colors.muted },
  roster: { gap: 8, marginTop: 8 },
})
