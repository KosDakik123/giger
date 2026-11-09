import type { Member, Song, SongSuggestion, SyncState, ThemeId } from '@/types'

const SESSION_KEY = 'giger.session.v1'
const SOLO_KEY = 'giger.solo.v1'
const BANDS_KEY = 'giger.bands.v1'
const LEGACY_SESSION = 'bend.session.v1'
const LEGACY_SOLO = 'bend.solo.v1'

export interface PersistedSession {
  mode: 'host' | 'guest' | 'solo'
  selfId: string
  state: SyncState
}

/** Durable memory of a band — survives leave/revisit on this device. */
export interface BandMemory {
  peerId: string
  name: string
  pin: string
  /** Known roster (roles/avatars) for quick re-entry. */
  roster: Array<Pick<Member, 'id' | 'name' | 'role' | 'avatarId' | 'isLeader'>>
  songs: Song[]
  setlistOrder: string[]
  suggestions: SongSuggestion[]
  theme?: ThemeId
  lastSelfId?: string
  updatedAt: number
}

export function saveSession(session: PersistedSession) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  } catch {
    // ignore
  }
}

export function loadSession(): PersistedSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY) || localStorage.getItem(LEGACY_SESSION)
    if (!raw) return null
    return JSON.parse(raw) as PersistedSession
  } catch {
    return null
  }
}

export function clearSession() {
  try {
    localStorage.removeItem(SESSION_KEY)
    localStorage.removeItem(LEGACY_SESSION)
  } catch {
    // ignore
  }
}

export function saveSoloState(state: SyncState) {
  try {
    localStorage.setItem(SOLO_KEY, JSON.stringify(state))
  } catch {
    // ignore
  }
}

export function loadSoloState(): SyncState | null {
  try {
    const raw = localStorage.getItem(SOLO_KEY) || localStorage.getItem(LEGACY_SOLO)
    if (!raw) return null
    return JSON.parse(raw) as SyncState
  } catch {
    return null
  }
}

function readBands(): Record<string, BandMemory> {
  try {
    const raw = localStorage.getItem(BANDS_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as Record<string, BandMemory>
  } catch {
    return {}
  }
}

function writeBands(map: Record<string, BandMemory>) {
  try {
    localStorage.setItem(BANDS_KEY, JSON.stringify(map))
  } catch {
    // ignore
  }
}

export function listRememberedBands(): BandMemory[] {
  return Object.values(readBands()).sort((a, b) => b.updatedAt - a.updatedAt)
}

export function loadBandMemory(peerId: string): BandMemory | null {
  return readBands()[peerId] ?? null
}

export function rememberBand(state: SyncState, selfId?: string) {
  if (!state.lobby.peerId || state.lobby.peerId === 'solo') {
    // Still remember solo practice under a stable key
  }
  const key = state.lobby.peerId || 'solo'
  const map = readBands()
  const prev = map[key]
  const rosterMap = new Map<string, BandMemory['roster'][number]>()
  for (const m of prev?.roster ?? []) rosterMap.set(m.id, m)
  for (const m of state.members) {
    rosterMap.set(m.id, {
      id: m.id,
      name: m.name,
      role: m.role,
      avatarId: m.avatarId,
      isLeader: m.isLeader,
    })
  }

  map[key] = {
    peerId: key,
    name: state.lobby.name,
    pin: state.lobby.pin,
    roster: [...rosterMap.values()],
    songs: state.songs,
    setlistOrder: state.setlistOrder,
    suggestions: state.suggestions ?? [],
    theme: state.theme,
    lastSelfId: selfId ?? prev?.lastSelfId,
    updatedAt: Date.now(),
  }
  writeBands(map)
}

export function forgetBand(peerId: string) {
  const map = readBands()
  delete map[peerId]
  writeBands(map)
}
