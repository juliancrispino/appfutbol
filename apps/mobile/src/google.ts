import { Platform } from 'react-native'
import { api } from './api'
import type { Session } from './types'

export async function signInWithGoogle(): Promise<Session> {
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID
  if (!webClientId) throw new Error('Falta EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID')
  if (Platform.OS !== 'android') throw new Error('El ingreso con Google está en la app de Android')

  const { GoogleSignin } = await import('@react-native-google-signin/google-signin')
  GoogleSignin.configure({ webClientId })
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true })
  const result = await GoogleSignin.signIn()
  if (result.type !== 'success' || !result.data.idToken) throw new Error('No se completó el ingreso con Google')
  return api<Session>('/api/auth/google', { body: { idToken: result.data.idToken }, auth: false })
}
