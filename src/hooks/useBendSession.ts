import { useCallback, useEffect, useRef, useState } from 'react'
import { createPresetSongs, defaultSetlistOrder } from '@/data/presets'
import { clearSession, loadSession, saveSession, saveSoloState } from '@/lib/storage'
import { LobbySync, type SyncStatus } from '@/lib/sync'
import { lobbyPeerId, uid } from '@/lib/utils'
import type {
  AppScreen,
  AvatarId,
  Member,
  Role,
  SessionTab,
  Song,
  SyncState,
} from '@/types'

interface PendingLobby {
  name: string
  pin: string
  peerId: string
  intent: 'host' | 'guest' | 'solo'
}

export function useBendSession() {
  const syncRef = useRef<LobbySync | null>(null)
  const scrollTimer = useRef<number | null>(null)

  const [screen, setScreen] = useState<AppScreen>('landing')
  const [tab, setTab] = useState<SessionTab>('live')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<SyncStatus>('idle')
  const [statusDetail, setStatusDetail] = useState<string | undefined>()
  const [pending, setPending] = useState<PendingLobby | null>(null)
  const [self, setSelf] = useState<Member | null>(null)
  const [state, setState] = useState<SyncState | null>(null)
  const [reacting, setReacting] = useState(false)
  const prevSong = useRef<string | null>(null)

  useEffect(() => {
    const saved = loadSession()
    if (!saved) return
    // Soft restore into landing with message — full auto-rejoin is flaky with PeerJS IDs.
    setError(`Last lobby: ${saved.state.lobby.name}. Create/join again to reconnect.`)
  }, [])

  useEffect(() => {
    if (!state?.activeSongId) return
    if (prevSong.current && prevSong.current !== state.activeSongId) {
      setReacting(true)
      const t = window.setTimeout(() => setReacting(false), 1200)
      return () => window.clearTimeout(t)
    }
    prevSong.current = state.activeSongId
  }, [state?.activeSongId])

  useEffect(() => {
    if (!state || !self) return
    const mode =
      syncRef.current?.getMode() === 'host'
        ? 'host'
        : syncRef.current?.getMode() === 'guest'
          ? 'guest'
          : 'solo'
    saveSession({ mode, selfId: self.id, state })
    if (mode === 'solo') saveSoloState(state)
  }, [state, self])

  const ensureSync = () => {
    if (syncRef.current) return syncRef.current
    const sync = new LobbySync({
      onStatus: (s, detail) => {
        setStatus(s)
        setStatusDetail(detail)
      },
      onState: (next) => setState(next),
    })
    syncRef.current = sync
    return sync
  }

  const beginCreate = async (name: string, pin: string) => {
    setBusy(true)
    setError(null)
    try {
      const peerId = await lobbyPeerId(name, pin)
      setPending({ name, pin, peerId, intent: 'host' })
      setScreen('member-entry')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not prepare lobby')
    } finally {
      setBusy(false)
    }
  }

  const beginJoin = async (name: string, pin: string) => {
    setBusy(true)
    setError(null)
    try {
      const peerId = await lobbyPeerId(name, pin)
      setPending({ name, pin, peerId, intent: 'guest' })
      setScreen('member-entry')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not prepare lobby')
    } finally {
      setBusy(false)
    }
  }

  const beginSolo = () => {
    setError(null)
    setPending({
      name: 'Solo Practice',
      pin: '0000',
      peerId: 'solo',
      intent: 'solo',
    })
    setScreen('member-entry')
  }

  const enterAsMember = async (payload: {
    name: string
    role: Role
    avatarId: AvatarId
  }) => {
    if (!pending) return
    setBusy(true)
    setError(null)

    const member: Member = {
      id: uid('member'),
      name: payload.name,
      role: payload.role,
      avatarId: payload.avatarId,
      isLeader: pending.intent === 'host' || pending.intent === 'solo',
      joinedAt: Date.now(),
    }

    const songs = createPresetSongs()
    const initial: SyncState = {
      lobby: {
        name: pending.name,
        pin: pending.pin,
        peerId: pending.peerId,
        createdAt: Date.now(),
      },
      members: [member],
      songs,
      setlistOrder: defaultSetlistOrder(songs),
      activeSongId: songs[0]?.id ?? null,
      scrollRatio: 0,
      showChords: true,
      autoScroll: false,
      updatedAt: Date.now(),
    }

    if (syncRef.current) {
      syncRef.current.destroy()
      syncRef.current = null
    }
    const fresh = ensureSync()

    try {
      if (pending.intent === 'host') {
        await fresh.startHost(pending.peerId, member, initial)
      } else if (pending.intent === 'solo') {
        fresh.startSolo(member, initial)
      } else {
        await fresh.startGuest(pending.peerId, member)
      }
      setSelf(member)
      if (pending.intent !== 'guest') setState(initial)
      setScreen('session')
      setTab('live')
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Join failed. Confirm the lobby name/PIN and that the leader still has BEND open.',
      )
      setScreen('landing')
      setPending(null)
    } finally {
      setBusy(false)
    }
  }

  const publish = useCallback((patch: Partial<SyncState>) => {
    const sync = syncRef.current
    if (!sync) {
      setState((prev) => (prev ? { ...prev, ...patch, updatedAt: Date.now() } : prev))
      return
    }
    if (sync.getMode() === 'guest') {
      // Optimistic local UX while host rebroadcasts
      setState((prev) => (prev ? { ...prev, ...patch, updatedAt: Date.now() } : prev))
    }
    sync.publish(patch)
  }, [])

  const setScrollRatio = useCallback(
    (ratio: number) => {
      if (scrollTimer.current) window.clearTimeout(scrollTimer.current)
      scrollTimer.current = window.setTimeout(() => {
        publish({ scrollRatio: ratio })
      }, 80)
    },
    [publish],
  )

  const activeSong = state?.songs.find((s) => s.id === state.activeSongId) ?? null

  const selectSong = (id: string) => {
    publish({ activeSongId: id, scrollRatio: 0 })
    setTab('live')
  }

  const shiftSong = (dir: -1 | 1) => {
    if (!state) return
    const order = state.setlistOrder
    const i = state.activeSongId ? order.indexOf(state.activeSongId) : -1
    const next = order[i + dir]
    if (!next) return
    publish({ activeSongId: next, scrollRatio: 0 })
  }

  const saveSong = (song: Song) => {
    if (!state) return
    const exists = state.songs.some((s) => s.id === song.id)
    const songs = exists
      ? state.songs.map((s) => (s.id === song.id ? song : s))
      : [...state.songs, song]
    const setlistOrder = exists ? state.setlistOrder : [...state.setlistOrder, song.id]
    publish({
      songs,
      setlistOrder,
      activeSongId: state.activeSongId ?? song.id,
    })
  }

  const deleteSong = (id: string) => {
    if (!state) return
    const songs = state.songs.filter((s) => s.id !== id)
    const setlistOrder = state.setlistOrder.filter((x) => x !== id)
    const activeSongId =
      state.activeSongId === id ? (setlistOrder[0] ?? null) : state.activeSongId
    publish({ songs, setlistOrder, activeSongId })
  }

  const leave = () => {
    syncRef.current?.leave()
    syncRef.current = null
    clearSession()
    setSelf(null)
    setState(null)
    setPending(null)
    setStatus('idle')
    setStatusDetail(undefined)
    setScreen('landing')
    setError(null)
  }

  const backFromMember = () => {
    setPending(null)
    setScreen('landing')
    setError(null)
  }

  return {
    screen,
    tab,
    setTab,
    busy,
    error,
    status,
    statusDetail,
    pending,
    self,
    state,
    activeSong,
    reacting,
    beginCreate,
    beginJoin,
    beginSolo,
    enterAsMember,
    backFromMember,
    publish,
    setScrollRatio,
    selectSong,
    shiftSong,
    saveSong,
    deleteSong,
    leave,
  }
}
