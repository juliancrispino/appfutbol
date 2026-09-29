import { router, useLocalSearchParams } from 'expo-router'
import { showMatchSavedAd } from '@/ads'
import { useGroup } from '@/group'
import { MatchForm } from '@/MatchForm'
import { Muted, Screen } from '@/ui'

export default function EditMatchScreen() {
  const { matchId } = useLocalSearchParams<{ matchId: string }>()
  const { detail, refresh } = useGroup()
  const match = detail?.matches.find((item) => item.id === matchId)
  if (!detail) return <Screen><Muted>Cargando...</Muted></Screen>
  if (!match) return <Screen><Muted>No encontramos ese partido.</Muted></Screen>

  return (
    <Screen>
      <MatchForm
        detail={detail}
        match={match}
        onSaved={() => {
          showMatchSavedAd()
          refresh().finally(() => router.back())
        }}
      />
    </Screen>
  )
}
