import { Stack, useLocalSearchParams } from 'expo-router'
import { GroupProvider } from '@/group'
import { colors } from '@/theme'

export default function GroupLayout() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>()
  return (
    <GroupProvider groupId={groupId}>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.text,
          contentStyle: { backgroundColor: colors.bg },
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="match/new" options={{ title: 'Cargar partido' }} />
        <Stack.Screen name="match/[matchId]" options={{ title: 'Editar partido' }} />
      </Stack>
    </GroupProvider>
  )
}
