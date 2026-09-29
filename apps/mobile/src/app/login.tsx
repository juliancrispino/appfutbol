import { Link, Redirect, router } from 'expo-router'
import { useState } from 'react'
import { StyleSheet, Text } from 'react-native'
import { api, ApiError } from '@/api'
import { useAuth } from '@/auth'
import { signInWithGoogle } from '@/google'
import { takePendingInvite } from '@/session'
import type { Session } from '@/types'
import { colors } from '@/theme'
import { Button, ErrorText, Field, Muted, Screen, Title } from '@/ui'

export default function LoginScreen() {
  const { session, login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (session) return <Redirect href="/grupos" />

  async function enter(next: Session) {
    await login(next)
    const pending = await takePendingInvite()
    router.replace(pending ? `/j/${pending}` : '/grupos')
  }

  async function submit() {
    setBusy(true)
    setError(null)
    try {
      await enter(await api<Session>('/api/auth/login', { body: { email, password }, auth: false }))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo entrar')
    } finally {
      setBusy(false)
    }
  }

  async function google() {
    setBusy(true)
    setError(null)
    try {
      await enter(await signInWithGoogle())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo entrar con Google')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Screen>
      <Title>Turnos Fútbol</Title>
      <Muted>Entrá para crear un turno o sumarte al link que te pasaron.</Muted>
      <Field label="Email" value={email} onChangeText={setEmail} keyboard="email-address" />
      <Field label="Contraseña" value={password} onChangeText={setPassword} secure />
      <ErrorText>{error}</ErrorText>
      <Button label={busy ? 'Entrando...' : 'Entrar'} onPress={submit} disabled={busy} />
      <Button label="Entrar con Google" onPress={google} disabled={busy} tone="ghost" />
      <Link href="/codigo" style={styles.link}>
        Prefiero un código al mail
      </Link>
      <Link href="/registro" style={styles.link}>
        Crear cuenta con contraseña
      </Link>
      <Link href="/privacidad" style={styles.quiet}>
        Privacidad y anuncios
      </Link>
    </Screen>
  )
}

const styles = StyleSheet.create({
  link: { color: colors.emerald, fontWeight: '700', fontSize: 15 },
  quiet: { color: colors.muted, fontSize: 13 },
})
