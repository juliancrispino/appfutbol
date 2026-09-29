import { router, Tabs } from 'expo-router'
import { Pressable, Text } from 'react-native'
import { useGroup } from '@/group'
import { colors } from '@/theme'

export default function GroupTabs() {
  const { detail } = useGroup()
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        title: detail?.group.name ?? 'Turno',
        tabBarStyle: { backgroundColor: colors.bg, borderTopColor: colors.border },
        tabBarActiveTintColor: colors.emerald,
        tabBarInactiveTintColor: colors.muted,
        headerLeft: () => (
          <Pressable onPress={() => router.replace('/grupos')}>
            <Text style={{ color: colors.emerald, fontWeight: '700', paddingHorizontal: 12 }}>Turnos</Text>
          </Pressable>
        ),
      }}
    >
      <Tabs.Screen name="index" options={{ title: detail?.group.name ?? 'Ranking', tabBarLabel: 'Ranking' }} />
      <Tabs.Screen name="matches" options={{ title: 'Partidos', tabBarLabel: 'Partidos' }} />
      <Tabs.Screen name="players" options={{ title: 'Plantel', tabBarLabel: 'Plantel' }} />
      <Tabs.Screen name="teams" options={{ title: 'Equipos', tabBarLabel: 'Equipos' }} />
      <Tabs.Screen name="settings" options={{ title: 'Ajustes', tabBarLabel: 'Ajustes' }} />
    </Tabs>
  )
}
