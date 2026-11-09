export type Role = 'Guitar' | 'Vocals' | 'Drums' | 'Bass' | 'Keys' | 'Other'

export type AvatarId =
  | 'spark-fox'
  | 'moon-cat'
  | 'amp-bear'
  | 'wave-bird'
  | 'neon-bunny'
  | 'star-owl'

export interface Member {
  id: string
  name: string
  role: Role
  avatarId: AvatarId
  isLeader: boolean
  joinedAt: number
}

export interface Song {
  id: string
  title: string
  artist: string
  lyrics: string
  chords: string
  /** Tonalitet — key / scale (e.g. Em, A major). */
  key: string
  tempo: number
  /** Rhythm feel — e.g. "straight 4/4", "shuffle", "half-time". */
  feel: string
  notes: string
}

export interface LobbyMeta {
  name: string
  pin: string
  peerId: string
  createdAt: number
}

/** Synced "want this next" votes — one entry per song, many backers. */
export interface SongSuggestion {
  songId: string
  /** Member ids who want this next (order = first suggest time). */
  backerIds: string[]
  /** Display names snapshot for offline clarity. */
  backerNames: string[]
  updatedAt: number
}

export type ThemeId = 'stage' | 'neon' | 'daylight' | 'ember'

export interface SyncState {
  lobby: LobbyMeta
  members: Member[]
  songs: Song[]
  /** Ordered song ids — shared lockstep queue for the whole lobby. */
  setlistOrder: string[]
  /** Currently live song id. */
  activeSongId: string | null
  /**
   * Explicit 0-based index into setlistOrder for the live slot.
   * Kept in sync with activeSongId so every member shares the same position.
   */
  activeIndex: number
  scrollRatio: number
  showChords: boolean
  autoScroll: boolean
  /** Shared lobby look — Stage Dark, Neon Pit, Daylight, Ember. */
  theme: ThemeId
  /** Live queue of "we want this next" suggestions. */
  suggestions: SongSuggestion[]
  /** Monotonic revision — host bumps on every authoritative change. */
  revision: number
  updatedAt: number
}

export type ControlMessage =
  | { type: 'hello'; member: Member }
  | { type: 'goodbye'; memberId: string }
  | { type: 'request-state' }
  | { type: 'full-state'; state: SyncState }
  | {
      type: 'patch'
      patch: Partial<SyncState>
      fromId: string
      /** Guest's last-seen host revision; host ignores older races when possible. */
      baseRevision: number
    }
  | { type: 'ping'; t: number }
  | { type: 'pong'; t: number }

export type AppScreen = 'landing' | 'member-entry' | 'session'
export type SessionTab = 'live' | 'setlist' | 'band'
