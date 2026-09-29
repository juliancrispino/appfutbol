import { router } from 'expo-router'
import { useEffect, useState } from 'react'
import { Alert, Share, StyleSheet, Text } from 'react-native'
import { api, ApiError } from '@/api'
import { useGroup } from '@/group'
import { clearLastGroup } from '@/session'
import { colors } from '@/theme'
import { Button, ErrorText, Field, Muted, Screen } from '@/ui'

export default function SettingsScreen() {
  const { detail, refresh } = useGroup()
  const [name, setName] = useState(detail?.group.name ?? '')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    if (detail) setName(detail.group.name)
  }, [detail])
  if (!detail) return <Screen><Muted>Cargando...</Muted></Screen>

  async function share() {
    if (!detail) return
    await Share.share({ message: `Sumate a ${detail.group.name}: ${detail.group.inviteUrl}` })
  }

  async function rename() {
    if (!detail) return
    setBusy(true)
    setError(null)
    try {
      await api(`/api/groups/${detail.group.id}`, { method: 'PATCH', body: { name } })
      await refresh()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo renombrar')
    } finally {
      setBusy(false)
    }
  }

  async function regenerate() {
    if (!detail) return
    setBusy(true)
    setError(null)
    try {
      await api(`/api/groups/${detail.group.id}/invite/regenerate`, { method: 'POST' })
      await refresh()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo regenerar el link')
    } finally {
      setBusy(false)
    }
  }

  function destroy() {
    if (!detail) return
    const groupId = detail.group.id
    Alert.alert('Borrar turno', 'Se borran los partidos y el ranking de este turno.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Borrar',
        style: 'destructive',
        onPress: async () => {
          await api(`/api/groups/${groupId}`, { method: 'DELETE' })
          await clearLastGroup()
          router.replace('/grupos')
        },
      },
    ])
  }

  function leave() {
    if (!detail) return
    const groupId = detail.group.id
    const memberId = detail.meMemberId
    Alert.alert('Salir del turno', 'Tu ficha y su historial se borran de este turno.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Salir',
        style: 'destructive',
        onPress: async () => {
          await api(`/api/groups/${groupId}/members/${memberId}`, { method: 'DELETE' })
          await clearLastGroup()
          router.replace('/grupos')
        },
      },
    ])
  }

  return (
    <Screen>
      <Muted>Compartí este link. Quien lo abra elige si es una ficha nueva o un invitado que ya estaba cargado.</Muted>
      <Text style={styles.link}>{detail.group.inviteUrl}</Text>
      <Button label="Compartir invitación" onPress={share} />
      {detail.group.isOwner ? (
        <>
          <Button label="Generar un link nuevo" tone="ghost" onPress={regenerate} disabled={busy} />
          <Field label="Nombre del turno" value={name} onChangeText={setName} />
          <Button label="Guardar nombre" tone="ghost" onPress={rename} disabled={busy} />
          <Button label="Borrar turno" tone="danger" onPress={destroy} />
        </>
      ) : (
        <Button label="Salir del turno" tone="danger" onPress={leave} />
      )}
      <ErrorText>{error}</ErrorText>
    </Screen>
  )
}

const styles = StyleSheet.create({
  link: { color: colors.emerald, fontSize: 14 },
})
