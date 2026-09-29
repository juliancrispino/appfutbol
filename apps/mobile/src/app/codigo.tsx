import { Redirect, router } from 'expo-router'
import { useState } from 'react'
import { api, ApiError } from '@/api'
import { useAuth } from '@/auth'
import { takePendingInvite } from '@/session'
import type { Session } from '@/types'
import { Button, ErrorText, Field, Muted, Screen } from '@/ui'

export default function CodeScreen() {
  const { session, login } = useAuth()
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [devCode, setDevCode] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (session) return <Redirect href="/grupos" />

  async function requestCode() {
    setBusy(true)
    setError(null)
    try {
      const result = await api<{ ok: boolean; devCode?: string }>('/api/auth/email-code', { body: { email }, auth: false })
      setSent(true)
      setDevCode(result.devCode ?? null)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo enviar el código')
    } finally {
      setBusy(false)
    }
  }

  async function verify() {
    setBusy(true)
    setError(null)
    try {
      const next = await api<Session>('/api/auth/email-code/verify', {
        body: { email, code, name: name || undefined },
        auth: false,
      })
      await login(next)
      const pending = await takePendingInvite()
      router.replace(pending ? `/j/${pending}` : '/grupos')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Código inválido')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Screen>
      <Muted>Te mandamos 6 números. Si el mail no tiene cuenta, se crea al confirmar.</Muted>
      <Field label="Email" value={email} onChangeText={setEmail} keyboard="email-address" />
      <Button label={busy && !sent ? 'Enviando...' : 'Mandame el código'} onPress={requestCode} disabled={busy} />
      {devCode ? <Muted>Modo local: el código es {devCode}</Muted> : null}
      {sent ? (
        <>
          <Field label="Código" value={code} onChangeText={setCode} keyboard="numeric" placeholder="6 números" />
          <Field label="Nombre, si es tu primera vez" value={name} onChangeText={setName} />
          <Button label={busy ? 'Confirmando...' : 'Entrar'} onPress={verify} disabled={busy} />
        </>
      ) : null}
      <ErrorText>{error}</ErrorText>
    </Screen>
  )
}
