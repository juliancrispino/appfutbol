let draft: { groupId: string; teamA: string[]; teamB: string[] } | null = null

export function setMatchDraft(next: { groupId: string; teamA: string[]; teamB: string[] }) {
  draft = next
}

export function takeMatchDraft(groupId: string) {
  if (draft?.groupId !== groupId) return null
  const value = draft
  draft = null
  return value
}
