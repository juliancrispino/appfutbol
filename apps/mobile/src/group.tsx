import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { api, ApiError } from './api'
import { setLastGroup } from './session'
import type { GroupDetail } from './types'

type GroupValue = {
  groupId: string
  detail: GroupDetail | null
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

const GroupContext = createContext<GroupValue | null>(null)

export function GroupProvider({ groupId, children }: { groupId: string; children: ReactNode }) {
  const [detail, setDetail] = useState<GroupDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      const next = await api<GroupDetail>(`/api/groups/${groupId}`)
      setDetail(next)
      setError(null)
      await setLastGroup(groupId)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo cargar el turno')
    } finally {
      setLoading(false)
    }
  }, [groupId])

  useEffect(() => {
    setLoading(true)
    refresh()
  }, [refresh])

  return <GroupContext.Provider value={{ groupId, detail, loading, error, refresh }}>{children}</GroupContext.Provider>
}

export function useGroup() {
  const value = useContext(GroupContext)
  if (!value) throw new Error('Falta el turno')
  return value
}
