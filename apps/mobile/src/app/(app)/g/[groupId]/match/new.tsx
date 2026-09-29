import { router } from 'expo-router'
import { useState } from 'react'
import { showMatchSavedAd } from '@/ads'
import { takeMatchDraft } from '@/draft'
import { useGroup } from '@/group'
import { MatchForm } from '@/MatchForm'
import { Muted, Screen } from '@/ui'

export default function NewMatchScreen() {
  const { detail, groupId, refresh } = useGroup()
  const [draft] = useState(() => takeMatchDraft(groupId))
  if (!detail) return <Screen><Muted>Cargando...</Muted></Screen>

  return (
    <Screen>
      <MatchForm
        detail={detail}
        initialTeams={draft}
        onSaved={() => {
          showMatchSavedAd()
          refresh().finally(() => router.back())
        }}
      />
    </Screen>
  )
}
