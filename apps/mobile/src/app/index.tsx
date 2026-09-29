import { Redirect } from 'expo-router'
import { useEffect, useState } from 'react'
import { ActivityIndicator, View } from 'react-native'
import { useAuth } from '@/auth'
import { getLastGroup, takePendingInvite } from '@/session'
import { colors } from '@/theme'

export default function Index() {
  const { ready, session } = useAuth()
  const [target, setTarget] = useState<string | null>(null)

  useEffect(() => {
    if (!ready) return
    if (!session) {
      setTarget('/login')
      return
    }
    takePendingInvite().then(async (pending) => {
      if (pending) {
        setTarget(`/j/${pending}`)
        return
      }
      const last = await getLastGroup()
      setTarget(last ? `/g/${last}` : '/grupos')
    })
  }, [ready, session])

  if (!target) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.emerald} />
      </View>
    )
  }

  return <Redirect href={target as '/login'} />
}
