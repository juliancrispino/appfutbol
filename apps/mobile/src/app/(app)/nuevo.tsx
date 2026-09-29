import { router } from 'expo-router'
import { useState } from 'react'
import { api, ApiError } from '@/api'
import { emptyProfile, ProfileFields } from '@/profile-fields'
import type { GroupDetail } from '@/types'
import { Button, ErrorText, Field, Screen } from '@/ui'

export default function NewGroupScreen() {
  const [name, setName] = useState('')
  const [profile, setProfile] = useState(emptyProfile)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit() {
    setBusy(true)
    setError(null)
    try {
      const detail = await api<GroupDetail>('/api/groups', { body: { name, ...profile } })
      router.replace(`/g/${detail.group.id}`)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo crear el turno')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Screen>
      <Field label="Nombre del turno" value={name} onChangeText={setName} placeholder="Martes 21 hs" />
      <ProfileFields value={profile} onChange={setProfile} />
      <ErrorText>{error}</ErrorText>
      <Button label={busy ? 'Creando...' : 'Crear turno'} onPress={submit} disabled={busy} />
    </Screen>
  )
}
