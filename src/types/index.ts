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
  key: string
  tempo: number
  notes: string
}

export interface LobbyMeta {
  name: string
  pin: string
  peerId: string
  createdAt: number
}

export interface SyncState {
  lobby: LobbyMeta
  members: Member[]
  songs: Song[]
  setlistOrder: string[]
  activeSongId: string | null
  scrollRatio: number
  showChords: boolean
  autoScroll: boolean
  updatedAt: number
}

export type ControlMessage =
  | { type: 'hello'; member: Member }
  | { type: 'goodbye'; memberId: string }
  | { type: 'request-state' }
  | { type: 'full-state'; state: SyncState }
  | { type: 'patch'; patch: Partial<SyncState>; fromId: string }
  | { type: 'ping' }

export type AppScreen = 'landing' | 'member-entry' | 'session'
export type SessionTab = 'live' | 'setlist' | 'band'
