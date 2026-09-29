import { useState } from 'react'
import { Alert, Pressable, StyleSheet, Text } from 'react-native'
import { AdBanner } from '@/ads'
import { api, ApiError } from '@/api'
import { useGroup } from '@/group'
import { positionShort } from '@/labels'
import { emptyProfile, ProfileFields } from '@/profile-fields'
import { colors } from '@/theme'
import type { Member, ProfileInput } from '@/types'
import { Button, ErrorText, Muted, Screen } from '@/ui'

export default function PlayersScreen() {
  const { detail, refresh } = useGroup()
  const [profile, setProfile] = useState(emptyProfile)
  const [editing, setEditing] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const me = detail?.members.find((member) => member.id === detail.meMemberId)

  async function addGuest() {
    if (!detail) return
    setBusy(true)
    setError(null)
    try {
      await api(`/api/groups/${detail.group.id}/members`, { body: profile })
      setProfile(emptyProfile)
      await refresh()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo agregar')
    } finally {
      setBusy(false)
    }
  }

  async function saveEdit(member: Member, next: ProfileInput) {
    if (!detail) return
    setBusy(true)
    setError(null)
    try {
      await api(`/api/groups/${detail.group.id}/members/${member.id}`, { method: 'PATCH', body: next })
      setEditing(null)
      await refresh()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo guardar')
    } finally {
      setBusy(false)
    }
  }

  function remove(member: Member) {
    if (!detail) return
    Alert.alert('Sacar jugador', `${member.displayName} sale del turno y de los partidos ya cargados.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sacar',
        style: 'destructive',
        onPress: async () => {
          try {
            await api(`/api/groups/${detail.group.id}/members/${member.id}`, { method: 'DELETE' })
            await refresh()
          } catch (err) {
            setError(err instanceof ApiError ? err.message : 'No se pudo sacar')
          }
        },
      },
    ])
  }

  return (
    <Screen>
      <Muted>Un invitado suma goles, MVP y Elo aunque no tenga cuenta. Cuando entre con el link, puede reclamar su ficha.</Muted>
      <ProfileFields value={profile} onChange={setProfile} nameLabel="Invitado sin cuenta" />
      <Button label={busy ? 'Agregando...' : 'Agregar invitado'} onPress={addGuest} disabled={busy} />
      {(detail?.members ?? []).map((member) => {
        const canEdit = detail?.group.isOwner || member.id === me?.id || member.isGuest
        const open = editing === member.id
        return (
          <Pressable key={member.id} onPress={() => canEdit && setEditing(open ? null : member.id)} style={styles.card}>
            <Text style={styles.name}>
              {member.displayName}
              {member.isGuest ? ' · Invitado' : ''}
            </Text>
            <Text style={styles.meta}>
              {positionShort(member.preferredPosition)} · Elo {member.elo}
              {member.isGoalkeeper ? ' · Arquero' : ''}
              {member.isCrack ? ' · Crack' : ''}
            </Text>
            {open ? (
              <Editor
                member={member}
                busy={busy}
                onSave={(next) => saveEdit(member, next)}
                onRemove={detail?.group.isOwner && member.userId !== detail.group.ownerUserId ? () => remove(member) : undefined}
              />
            ) : null}
          </Pressable>
        )
      })}
      <ErrorText>{error}</ErrorText>
      <AdBanner />
    </Screen>
  )
}

function Editor({
  member,
  busy,
  onSave,
  onRemove,
}: {
  member: Member
  busy: boolean
  onSave: (profile: ProfileInput) => void
  onRemove?: () => void
}) {
  const [profile, setProfile] = useState<ProfileInput>({
    displayName: member.displayName,
    preferredPosition: member.preferredPosition,
    isGoalkeeper: member.isGoalkeeper,
    isCrack: member.isCrack,
  })
  return (
    <>
      <ProfileFields value={profile} onChange={setProfile} />
      <Button label={busy ? 'Guardando...' : 'Guardar ficha'} onPress={() => onSave(profile)} disabled={busy} />
      {onRemove ? <Button label="Sacar del turno" tone="danger" onPress={onRemove} /> : null}
    </>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 8,
  },
  name: { color: colors.text, fontSize: 17, fontWeight: '800' },
  meta: { color: colors.muted },
})
