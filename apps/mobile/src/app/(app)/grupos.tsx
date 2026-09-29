import { router, Stack } from 'expo-router'
import { useCallback, useState } from 'react'
import { Pressable, StyleSheet, Text } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { AdBanner } from '@/ads'
import { api, ApiError } from '@/api'
import { useAuth } from '@/auth'
import { colors } from '@/theme'
import type { GroupSummary } from '@/types'
import { Button, Card, ErrorText, Muted, Screen } from '@/ui'

export default function GroupsScreen() {
  const { logout } = useAuth()
  const [groups, setGroups] = useState<GroupSummary[]>([])
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    api<{ groups: GroupSummary[] }>('/api/groups')
      .then((result) => {
        setGroups(result.groups)
        setError(null)
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'No se pudieron cargar los turnos'))
  }, [])

  useFocusEffect(load)

  return (
    <Screen>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable onPress={() => logout().then(() => router.replace('/login'))}>
              <Text style={styles.exit}>Salir</Text>
            </Pressable>
          ),
        }}
      />
      <Muted>Podés estar en varios turnos. Cada uno tiene su propio ranking.</Muted>
      <Button label="Crear turno" onPress={() => router.push('/nuevo')} />
      {groups.map((group) => (
        <Pressable key={group.id} onPress={() => router.push(`/g/${group.id}`)}>
          <Card>
            <Text style={styles.name}>{group.name}</Text>
            <Text style={styles.meta}>
              {group.displayName} · Elo {group.elo}
              {group.isOwner ? ' · Creador' : ''}
            </Text>
          </Card>
        </Pressable>
      ))}
      {groups.length === 0 ? <Muted>Todavía no hay turnos. Creá uno o abrí el link de invitación.</Muted> : null}
      <ErrorText>{error}</ErrorText>
      <AdBanner />
    </Screen>
  )
}

const styles = StyleSheet.create({
  exit: { color: colors.emerald, fontWeight: '700', paddingHorizontal: 8 },
  name: { color: colors.text, fontSize: 18, fontWeight: '800' },
  meta: { color: colors.muted },
})
