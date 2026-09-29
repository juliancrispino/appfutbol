import { Platform } from 'react-native'
import * as SecureStore from 'expo-secure-store'
import type { Session } from './types'

const SESSION_KEY = 'turnos.session'
const PENDING_KEY = 'turnos.pendingInvite'
const LAST_GROUP_KEY = 'turnos.lastGroup'

let session: Session | null = null
const listeners = new Set<() => void>()

async function getItem(key: string) {
  if (Platform.OS === 'web') return globalThis.localStorage?.getItem(key) ?? null
  return SecureStore.getItemAsync(key)
}

async function setItem(key: string, value: string) {
  if (Platform.OS === 'web') {
    globalThis.localStorage?.setItem(key, value)
    return
  }
  await SecureStore.setItemAsync(key, value)
}

async function deleteItem(key: string) {
  if (Platform.OS === 'web') {
    globalThis.localStorage?.removeItem(key)
    return
  }
  await SecureStore.deleteItemAsync(key)
}

export function getSession() {
  return session
}

export function subscribeSession(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export async function setSession(next: Session | null) {
  session = next
  if (next) await setItem(SESSION_KEY, JSON.stringify(next))
  else await deleteItem(SESSION_KEY)
  listeners.forEach((listener) => listener())
}

export async function hydrateSession() {
  const raw = await getItem(SESSION_KEY)
  if (!raw) return
  try {
    session = JSON.parse(raw) as Session
  } catch {
    session = null
    await deleteItem(SESSION_KEY)
  }
}

export async function setPendingInvite(token: string) {
  await setItem(PENDING_KEY, token)
}

export async function takePendingInvite() {
  const token = await getItem(PENDING_KEY)
  if (token) await deleteItem(PENDING_KEY)
  return token
}

export async function setLastGroup(groupId: string) {
  await setItem(LAST_GROUP_KEY, groupId)
}

export async function getLastGroup() {
  return getItem(LAST_GROUP_KEY)
}

export async function clearLastGroup() {
  await deleteItem(LAST_GROUP_KEY)
}
