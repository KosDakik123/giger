import { useCallback, useEffect, useRef, useState } from 'react'
import { createPresetSongs, defaultSetlistOrder } from '@/data/presets'
import { clearSession, loadSession, saveSession, saveSoloState } from '@/lib/storage'
import { moveSongToSlot, withActiveSlot } from '@/lib/setlist'
import { LobbySync, type SyncStatus } from '@/lib/sync'
import { DEFAULT_THEME, applyTheme, loadStoredTheme, type ThemeId } from '@/lib/themes'
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

export function useGigerSession() {
  const syncRef = useRef<LobbySync | null>(null)
  const scrollTimer = useRef<number | null>(null)
  const localRevision = useRef(0)

  const [screen, setScreen] = useState<AppScreen>('landing')
  const [tab, setTab] = useState<SessionTab>('live')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<SyncStatus>('idle')
  const [statusDetail, setStatusDetail] = useState<string | undefined>()
  const [pending, setPending] = useState<PendingLobby | null>(null)
  const [self, setSelf] = useState<Member | null>(null)
  const [state, setState] = useState<SyncState | null>(null)
  const [theme, setTheme] = useState<ThemeId>(() => loadStoredTheme())
  const [reacting, setReacting] = useState(false)
  const prevSong = useRef<string | null>(null)

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  useEffect(() => {
    if (state?.theme && state.theme !== theme) {
      setTheme(state.theme)
    }
  }, [state?.theme, theme])

  useEffect(() => {
    const saved = loadSession()
    if (!saved) return
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
      onState: (next) => {
        localRevision.current = next.revision
        setState(next)
      },
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
    const setlistOrder = defaultSetlistOrder(songs)
    const slot = withActiveSlot(
      { setlistOrder, activeSongId: songs[0]?.id ?? null, activeIndex: 0 },
      { setlistOrder, activeIndex: 0 },
    )
    const initial: SyncState = {
      lobby: {
        name: pending.name,
        pin: pending.pin,
        peerId: pending.peerId,
        createdAt: Date.now(),
      },
      members: [member],
      songs,
      ...slot,
      scrollRatio: 0,
      showChords: true,
      autoScroll: false,
      theme: theme || DEFAULT_THEME,
      revision: 1,
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
          : 'Join failed. Confirm the lobby name/PIN and that the leader still has GIGer open.',
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
      setState((prev) => {
        if (!prev) return prev
        const slot = withActiveSlot(prev, patch)
        return {
          ...prev,
          ...patch,
          ...slot,
          revision: prev.revision + 1,
          updatedAt: Date.now(),
        }
      })
      return
    }

    // Optimistic UI for guests — host full-state will confirm/correct
    if (sync.getMode() === 'guest') {
      setState((prev) => {
        if (!prev) return prev
        const slot = withActiveSlot(prev, patch)
        return {
          ...prev,
          ...patch,
          ...slot,
          updatedAt: Date.now(),
        }
      })
    }
    sync.publish(patch)
  }, [])

  const publishSlot = useCallback(
    (overrides: Partial<Pick<SyncState, 'setlistOrder' | 'activeSongId' | 'activeIndex'>> & {
      scrollRatio?: number
    }) => {
      if (!state) {
        publish(overrides)
        return
      }
      const slot = withActiveSlot(state, overrides)
      publish({
        ...slot,
        scrollRatio: overrides.scrollRatio ?? (overrides.activeSongId || overrides.activeIndex !== undefined ? 0 : state.scrollRatio),
      })
    },
    [publish, state],
  )

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

  /** Jump live playback to a specific song (exact setlist selection). */
  const selectSong = (id: string) => {
    publishSlot({ activeSongId: id, scrollRatio: 0 })
    setTab('live')
  }

  /** Jump live playback to an exact 0-based setlist index. */
  const jumpToIndex = (index: number) => {
    publishSlot({ activeIndex: index, scrollRatio: 0 })
    setTab('live')
  }

  const shiftSong = (dir: -1 | 1) => {
    if (!state) return
    const next = (state.activeIndex < 0 ? 0 : state.activeIndex) + dir
    if (next < 0 || next >= state.setlistOrder.length) return
    publishSlot({ activeIndex: next, scrollRatio: 0 })
  }

  /** Reorder whole setlist (drag/drop or arrows) and keep live slot lockstep. */
  const reorderSetlist = (order: string[]) => {
    publishSlot({ setlistOrder: order })
  }

  /** Place a song at an exact slot number (0-based). Syncs to lobby. */
  const placeSongAt = (songId: string, slot: number) => {
    if (!state) return
    const setlistOrder = moveSongToSlot(state.setlistOrder, songId, slot)
    publishSlot({ setlistOrder })
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
      ...withActiveSlot(state, {
        setlistOrder,
        activeSongId: state.activeSongId ?? song.id,
      }),
    })
  }

  const deleteSong = (id: string) => {
    if (!state) return
    const songs = state.songs.filter((s) => s.id !== id)
    const setlistOrder = state.setlistOrder.filter((x) => x !== id)
    publish({
      songs,
      ...withActiveSlot(state, {
        setlistOrder,
        activeSongId: state.activeSongId === id ? null : state.activeSongId,
      }),
    })
  }

  const setLobbyTheme = (next: ThemeId) => {
    setTheme(next)
    applyTheme(next)
    if (state) {
      publish({ theme: next })
    }
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
    theme,
    beginCreate,
    beginJoin,
    beginSolo,
    enterAsMember,
    backFromMember,
    publish,
    setScrollRatio,
    selectSong,
    jumpToIndex,
    shiftSong,
    reorderSetlist,
    placeSongAt,
    saveSong,
    deleteSong,
    setLobbyTheme,
    leave,
  }
}
