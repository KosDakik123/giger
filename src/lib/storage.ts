import type { SyncState } from '@/types'

const SESSION_KEY = 'bend.session.v1'
const SOLO_KEY = 'bend.solo.v1'

export interface PersistedSession {
  mode: 'host' | 'guest' | 'solo'
  selfId: string
  state: SyncState
}

export function saveSession(session: PersistedSession) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  } catch {
    // quota / private mode — ignore
  }
}

export function loadSession(): PersistedSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    return JSON.parse(raw) as PersistedSession
  } catch {
    return null
  }
}

export function clearSession() {
  try {
    localStorage.removeItem(SESSION_KEY)
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
    const raw = localStorage.getItem(SOLO_KEY)
    if (!raw) return null
    return JSON.parse(raw) as SyncState
  } catch {
    return null
  }
}
