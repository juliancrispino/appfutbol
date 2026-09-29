import { Redirect, router } from 'expo-router'
import { useState } from 'react'
import { api, ApiError } from '@/api'
import { useAuth } from '@/auth'
import { takePendingInvite } from '@/session'
import type { Session } from '@/types'
import { Button, ErrorText, Field, Screen } from '@/ui'

export default function RegisterScreen() {
  const { session, login } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (session) return <Redirect href="/grupos" />

  async function submit() {
    setBusy(true)
    setError(null)
    try {
      const next = await api<Session>('/api/auth/register', { body: { name, email, password }, auth: false })
      await login(next)
      const pending = await takePendingInvite()
      router.replace(pending ? `/j/${pending}` : '/grupos')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo crear la cuenta')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Screen>
      <Field label="Nombre" value={name} onChangeText={setName} />
      <Field label="Email" value={email} onChangeText={setEmail} keyboard="email-address" />
      <Field label="Contraseña" value={password} onChangeText={setPassword} secure placeholder="Mínimo 8 caracteres" />
      <ErrorText>{error}</ErrorText>
      <Button label={busy ? 'Creando...' : 'Crear cuenta'} onPress={submit} disabled={busy} />
    </Screen>
  )
}
