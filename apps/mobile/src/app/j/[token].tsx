import { router, useLocalSearchParams } from 'expo-router'
import { useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text } from 'react-native'
import { api, ApiError } from '@/api'
import { useAuth } from '@/auth'
import { emptyProfile, ProfileFields } from '@/profile-fields'
import { setPendingInvite } from '@/session'
import { colors } from '@/theme'
import type { Member, ProfileInput } from '@/types'
import { Button, Card, ErrorText, Muted, Screen, Title } from '@/ui'

type Preview = {
  groupId: string
  groupName: string
  alreadyMember: boolean
  guests: Member[]
}

export default function JoinScreen() {
  const { token } = useLocalSearchParams<{ token: string }>()
  const { ready, session } = useAuth()
  const [preview, setPreview] = useState<Preview | null>(null)
  const [profile, setProfile] = useState<ProfileInput>(emptyProfile)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!ready || !token) return
    if (!session) {
      setPendingInvite(token).then(() => router.replace('/login'))
      return
    }
    api<Preview>(`/api/join/${token}`)
      .then((next) => {
        if (next.alreadyMember) router.replace(`/g/${next.groupId}`)
        else setPreview(next)
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'La invitación no existe'))
  }, [ready, session, token])

  async function claim(memberId: string) {
    if (!token) return
    setBusy(true)
    setError(null)
    try {
      const result = await api<{ groupId: string }>(`/api/join/${token}`, { body: { claimMemberId: memberId } })
      router.replace(`/g/${result.groupId}`)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo reclamar la ficha')
    } finally {
      setBusy(false)
    }
  }

  async function createNew() {
    if (!token) return
    setBusy(true)
    setError(null)
    try {
      const result = await api<{ groupId: string }>(`/api/join/${token}`, { body: profile })
      router.replace(`/g/${result.groupId}`)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo entrar al turno')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Screen>
      <Title>{preview ? preview.groupName : 'Invitación'}</Title>
      <Muted>Si ya jugaste en este turno sin cuenta, elegí tu nombre y te quedás con los partidos, los goles y el Elo.</Muted>
      {preview?.guests.map((guest) => (
        <Pressable key={guest.id} disabled={busy} onPress={() => claim(guest.id)}>
          <Card>
            <Text style={styles.name}>{guest.displayName}</Text>
            <Text style={styles.meta}>
              Elo {guest.elo} · {guest.goals} goles · {guest.mvps} MVP
            </Text>
          </Card>
        </Pressable>
      ))}
      <Muted>O creá una ficha nueva. Arranca en 1000 de Elo.</Muted>
      <ProfileFields value={profile} onChange={setProfile} />
      <ErrorText>{error}</ErrorText>
      <Button label={busy ? 'Entrando...' : 'Soy nuevo en este turno'} onPress={createNew} disabled={busy || !preview} />
    </Screen>
  )
}

const styles = StyleSheet.create({
  name: { color: colors.text, fontSize: 18, fontWeight: '800' },
  meta: { color: colors.muted },
})
