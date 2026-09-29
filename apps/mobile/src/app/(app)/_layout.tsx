import { Redirect, Stack } from 'expo-router'
import { View } from 'react-native'
import { useAuth } from '@/auth'
import { colors } from '@/theme'

export default function AppLayout() {
  const { ready, session } = useAuth()
  if (!ready) return <View style={{ flex: 1, backgroundColor: colors.bg }} />
  if (!session) return <Redirect href="/login" />
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.text,
        contentStyle: { backgroundColor: colors.bg },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="grupos" options={{ title: 'Tus turnos' }} />
      <Stack.Screen name="nuevo" options={{ title: 'Nuevo turno' }} />
      <Stack.Screen name="g/[groupId]" options={{ headerShown: false }} />
    </Stack>
  )
}
