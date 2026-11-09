import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPresetSongs, defaultSetlistOrder } from '@/data/presets'
import {
  clearSession,
  forgetBand,
  listRememberedBands,
  loadBandMemory,
  loadSession,
  rememberBand,
  saveSession,
  saveSoloState,
  type BandMemory,
} from '@/lib/storage'
import { moveSongToSlot, withActiveSlot } from '@/lib/setlist'
import { toggleSuggestion } from '@/lib/suggestions'
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
  const [rememberedBands, setRememberedBands] = useState<BandMemory[]>(() => listRememberedBands())
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
    // Soft hint — band memory holds songs/roster; rejoin with same name+PIN
    setError(`Remembered band: ${saved.state.lobby.name}. Rejoin with the same name & PIN to pick up.`)
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
    rememberBand(state, self.id)
    setRememberedBands(listRememberedBands())
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

  const reopenBand = async (band: BandMemory) => {
    setBusy(true)
    setError(null)
    try {
      setPending({
        name: band.name,
        pin: band.pin,
        peerId: band.peerId,
        intent: band.peerId === 'solo' ? 'solo' : 'host',
      })
      setScreen('member-entry')
    } finally {
      setBusy(false)
    }
  }

  const pendingMemory = useMemo(
    () => (pending ? loadBandMemory(pending.peerId) : null),
    [pending],
  )

  const enterAsMember = async (payload: {
    name: string
    role: Role
    avatarId: AvatarId
  }) => {
    if (!pending) return
    setBusy(true)
    setError(null)

    const memory = loadBandMemory(pending.peerId)
    const reusedId =
      memory?.roster.find((m) => m.name.toLowerCase() === payload.name.toLowerCase())?.id ??
      uid('member')

    const member: Member = {
      id: reusedId,
      name: payload.name,
      role: payload.role,
      avatarId: payload.avatarId,
      isLeader: pending.intent === 'host' || pending.intent === 'solo',
      joinedAt: Date.now(),
    }

    const songs =
      memory?.songs?.length && pending.intent !== 'guest'
        ? memory.songs.map((s) => ({ ...s, feel: s.feel ?? '' }))
        : createPresetSongs()
    const setlistOrder = [
      ...(memory?.setlistOrder?.length && pending.intent !== 'guest'
        ? memory.setlistOrder.filter((id) => songs.some((s) => s.id === id))
        : defaultSetlistOrder(songs)),
    ]
    for (const s of songs) {
      if (!setlistOrder.includes(s.id)) setlistOrder.push(s.id)
    }

    const slot = withActiveSlot(
      { setlistOrder, activeSongId: setlistOrder[0] ?? null, activeIndex: 0 },
      { setlistOrder, activeIndex: 0 },
    )

    // Seed roster from memory + self for host
    const seedMembers: Member[] = [member]
    if (memory?.roster && pending.intent === 'host') {
      for (const r of memory.roster) {
        if (r.id === member.id) continue
        // keep remembered bandmates as offline placeholders until they rejoin
        seedMembers.push({
          id: r.id,
          name: r.name,
          role: r.role,
          avatarId: r.avatarId,
          isLeader: false,
          joinedAt: Date.now() - 1,
        })
      }
    }

    const initial: SyncState = {
      lobby: {
        name: pending.name,
        pin: pending.pin,
        peerId: pending.peerId,
        createdAt: memory ? Date.now() : Date.now(),
      },
      members: seedMembers,
      songs,
      ...slot,
      scrollRatio: 0,
      showChords: true,
      autoScroll: false,
      theme: memory?.theme || theme || DEFAULT_THEME,
      suggestions: memory?.suggestions ?? [],
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
        scrollRatio:
          overrides.scrollRatio ??
          (overrides.activeSongId || overrides.activeIndex !== undefined ? 0 : state.scrollRatio),
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

  const selectSong = (id: string) => {
    publishSlot({ activeSongId: id, scrollRatio: 0 })
    setTab('live')
  }

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

  const reorderSetlist = (order: string[]) => {
    publishSlot({ setlistOrder: order })
  }

  const placeSongAt = (songId: string, slot: number) => {
    if (!state) return
    const setlistOrder = moveSongToSlot(state.setlistOrder, songId, slot)
    publishSlot({ setlistOrder })
  }

  const saveSong = (song: Song) => {
    if (!state) return
    const normalized = { ...song, feel: song.feel ?? '' }
    const exists = state.songs.some((s) => s.id === song.id)
    const songs = exists
      ? state.songs.map((s) => (s.id === song.id ? normalized : s))
      : [...state.songs, normalized]
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
    const suggestions = (state.suggestions ?? []).filter((s) => s.songId !== id)
    publish({
      songs,
      suggestions,
      ...withActiveSlot(state, {
        setlistOrder,
        activeSongId: state.activeSongId === id ? null : state.activeSongId,
      }),
    })
  }

  const suggestSong = (songId: string) => {
    if (!state || !self) return
    publish({
      suggestions: toggleSuggestion(state.suggestions ?? [], songId, self),
    })
  }

  const clearSuggestion = (songId: string) => {
    if (!state) return
    publish({
      suggestions: (state.suggestions ?? []).filter((s) => s.songId !== songId),
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
    // Persist band memory before tearing down session
    if (state && self) rememberBand(state, self.id)
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
    setRememberedBands(listRememberedBands())
  }

  const forgetRememberedBand = (peerId: string) => {
    forgetBand(peerId)
    setRememberedBands(listRememberedBands())
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
    pendingMemory,
    self,
    state,
    activeSong,
    reacting,
    theme,
    rememberedBands,
    beginCreate,
    beginJoin,
    beginSolo,
    reopenBand,
    forgetRememberedBand,
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
    suggestSong,
    clearSuggestion,
    setLobbyTheme,
    leave,
  }
}
