import Peer, { type DataConnection } from 'peerjs'
import type { ControlMessage, Member, SyncState } from '@/types'
import { withActiveSlot } from '@/lib/setlist'

export type SyncStatus = 'idle' | 'connecting' | 'connected' | 'hosting' | 'solo' | 'error'

export interface SyncHandlers {
  onStatus: (status: SyncStatus, detail?: string) => void
  onState: (state: SyncState) => void
  onMembersHint?: (count: number) => void
}

/**
 * PeerJS lobby: host is authoritative.
 * - Guests send patches to the host only (reliable DataConnection).
 * - Host merges, bumps revision, and full-state broadcasts to everyone.
 * - Periodic host resync keeps setlist order + active slot lockstep.
 */
export class LobbySync {
  private peer: Peer | null = null
  private connections = new Map<string, DataConnection>()
  private hostConn: DataConnection | null = null
  private mode: 'host' | 'guest' | 'solo' = 'solo'
  private self: Member | null = null
  private state: SyncState | null = null
  private handlers: SyncHandlers
  private destroyed = false
  private resyncTimer: number | null = null
  private heartbeatTimer: number | null = null

  constructor(handlers: SyncHandlers) {
    this.handlers = handlers
  }

  getMode() {
    return this.mode
  }

  getRevision() {
    return this.state?.revision ?? 0
  }

  async startHost(peerId: string, self: Member, initial: SyncState) {
    this.mode = 'host'
    this.self = self
    this.state = normalizeState(initial)
    this.handlers.onStatus('connecting', 'Opening lobby channel…')

    try {
      await this.openPeer(peerId)
      if (this.destroyed) return
      this.handlers.onStatus('hosting', 'Lobby live — setlist syncs to every member')
      this.handlers.onState(this.state)
      this.startHostResync()
    } catch (err) {
      console.warn('PeerJS host failed, solo fallback', err)
      this.mode = 'solo'
      this.handlers.onStatus(
        'solo',
        'Could not reach sync broker — practicing solo. Local changes still save.',
      )
      this.handlers.onState(this.state)
    }
  }

  async startGuest(hostPeerId: string, self: Member) {
    this.mode = 'guest'
    this.self = self
    this.handlers.onStatus('connecting', 'Finding lobby…')

    try {
      await this.openPeer()
      if (this.destroyed) return
      const conn = this.peer!.connect(hostPeerId, { reliable: true })
      this.hostConn = conn
      this.wireConnection(conn, true)
      await waitOpen(conn, 14000)
      this.send(conn, { type: 'hello', member: self })
      this.send(conn, { type: 'request-state' })
      this.handlers.onStatus('connected', 'Live lockstep with lobby leader')
      this.startGuestHeartbeat()
    } catch (err) {
      console.warn('PeerJS guest failed', err)
      this.handlers.onStatus(
        'error',
        'Could not join lobby. Check name/PIN, or ask the leader to keep the app open.',
      )
      throw err
    }
  }

  startSolo(self: Member, initial: SyncState) {
    this.mode = 'solo'
    this.self = self
    this.state = normalizeState(initial)
    this.handlers.onStatus('solo', 'Solo rehearsal — changes stay on this device')
    this.handlers.onState(this.state)
  }

  /** Host / solo apply; guests forward patch to host. */
  publish(patch: Partial<SyncState>) {
    if (!this.self) return

    if (this.mode === 'guest') {
      const baseRevision = this.state?.revision ?? 0
      const msg: ControlMessage = {
        type: 'patch',
        patch: stripEphemeral(patch),
        fromId: this.self.id,
        baseRevision,
      }
      if (this.hostConn?.open) {
        this.send(this.hostConn, msg)
      } else {
        // Retry once connections settle
        window.setTimeout(() => {
          if (this.hostConn?.open) this.send(this.hostConn, msg)
        }, 200)
      }
      return
    }

    this.applyAuthoritative(patch)
  }

  leave() {
    if (this.self && this.mode === 'guest' && this.hostConn?.open) {
      this.send(this.hostConn, { type: 'goodbye', memberId: this.self.id })
    }
    this.destroy()
  }

  destroy() {
    this.destroyed = true
    if (this.resyncTimer) window.clearInterval(this.resyncTimer)
    if (this.heartbeatTimer) window.clearInterval(this.heartbeatTimer)
    this.resyncTimer = null
    this.heartbeatTimer = null
    for (const conn of this.connections.values()) {
      try {
        conn.close()
      } catch {
        // ignore
      }
    }
    this.connections.clear()
    this.hostConn = null
    if (this.peer) {
      try {
        this.peer.destroy()
      } catch {
        // ignore
      }
    }
    this.peer = null
  }

  private applyAuthoritative(patch: Partial<SyncState>) {
    if (!this.state) return
    const mergedMembers = patch.members ?? this.state.members
    const slot = withActiveSlot(this.state, {
      setlistOrder: patch.setlistOrder,
      activeSongId: patch.activeSongId,
      activeIndex: patch.activeIndex,
    })
    this.state = {
      ...this.state,
      ...stripEphemeral(patch),
      ...slot,
      members: mergedMembers,
      revision: this.state.revision + 1,
      updatedAt: Date.now(),
    }
    this.handlers.onState(this.state)
    this.broadcast({ type: 'full-state', state: this.state })
  }

  private openPeer(id?: string) {
    return new Promise<void>((resolve, reject) => {
      const peer = id
        ? new Peer(id, { debug: 0 })
        : new Peer({ debug: 0 })
      this.peer = peer

      const timer = window.setTimeout(() => {
        reject(new Error('PeerJS connection timeout'))
      }, 10000)

      peer.on('open', () => {
        window.clearTimeout(timer)
        resolve()
      })

      peer.on('error', (err) => {
        window.clearTimeout(timer)
        const anyErr = err as { type?: string; message?: string }
        const message =
          anyErr?.type === 'unavailable-id'
            ? 'That lobby is already open somewhere. Close the other tab or pick a new name.'
            : anyErr?.message || 'PeerJS error'
        reject(new Error(message))
      })

      peer.on('connection', (conn) => {
        this.wireConnection(conn, false)
      })
    })
  }

  private wireConnection(conn: DataConnection, isHostLink: boolean) {
    conn.on('open', () => {
      this.connections.set(conn.peer, conn)
      if (isHostLink) this.hostConn = conn
      this.handlers.onMembersHint?.(this.connections.size)
      if (this.mode === 'host' && this.state) {
        this.send(conn, { type: 'full-state', state: this.state })
      }
    })

    conn.on('data', (raw) => {
      this.handleMessage(raw as ControlMessage, conn)
    })

    conn.on('close', () => {
      this.connections.delete(conn.peer)
      if (this.hostConn?.peer === conn.peer) this.hostConn = null
      this.handlers.onMembersHint?.(this.connections.size)
      if (this.mode === 'guest') {
        this.handlers.onStatus(
          'error',
          'Lost lobby leader — ask them to keep GIGer open, then rejoin.',
        )
      }
    })
  }

  private handleMessage(msg: ControlMessage, conn: DataConnection) {
    if (!msg || typeof msg !== 'object' || !('type' in msg)) return

    switch (msg.type) {
      case 'hello': {
        if (this.mode === 'host' && this.state) {
          const exists = this.state.members.some((m) => m.id === msg.member.id)
          const members = exists
            ? this.state.members.map((m) => (m.id === msg.member.id ? msg.member : m))
            : [...this.state.members, { ...msg.member, isLeader: false }]
          this.applyAuthoritative({ members })
        }
        break
      }
      case 'goodbye': {
        if (this.mode === 'host' && this.state) {
          this.applyAuthoritative({
            members: this.state.members.filter((m) => m.id !== msg.memberId),
          })
        }
        break
      }
      case 'request-state': {
        if (this.mode === 'host' && this.state) {
          this.send(conn, { type: 'full-state', state: this.state })
        }
        break
      }
      case 'full-state': {
        const incoming = normalizeState(msg.state)
        // Guests always take host truth (higher or equal revision wins races)
        if (
          this.mode === 'guest' &&
          this.state &&
          incoming.revision < this.state.revision
        ) {
          break
        }
        this.state = incoming
        this.handlers.onState(incoming)
        if (this.mode === 'guest') {
          this.handlers.onStatus('connected', 'Live lockstep with lobby leader')
        }
        break
      }
      case 'patch': {
        if (this.mode === 'host' && this.state) {
          // Accept guest control; revision clock is host-owned
          this.applyAuthoritative({
            ...msg.patch,
            members: msg.patch.members ?? this.state.members,
          })
        }
        break
      }
      case 'ping': {
        this.send(conn, { type: 'pong', t: msg.t })
        break
      }
      case 'pong': {
        // Host liveness confirmed
        break
      }
      default:
        break
    }
  }

  private startHostResync() {
    if (this.resyncTimer) window.clearInterval(this.resyncTimer)
    this.resyncTimer = window.setInterval(() => {
      if (this.mode !== 'host' || !this.state || this.connections.size === 0) return
      this.broadcast({ type: 'full-state', state: this.state })
    }, 2500)
  }

  private startGuestHeartbeat() {
    if (this.heartbeatTimer) window.clearInterval(this.heartbeatTimer)
    this.heartbeatTimer = window.setInterval(() => {
      if (!this.hostConn?.open) return
      this.send(this.hostConn, { type: 'ping', t: Date.now() })
      // Soft re-request keeps late joiners / missed packets aligned
      this.send(this.hostConn, { type: 'request-state' })
    }, 4000)
  }

  private broadcast(msg: ControlMessage) {
    for (const conn of this.connections.values()) {
      this.send(conn, msg)
    }
  }

  private send(conn: DataConnection, msg: ControlMessage) {
    if (!conn.open) return
    try {
      conn.send(msg)
    } catch {
      // ignore flaky peers
    }
  }
}

function stripEphemeral(patch: Partial<SyncState>): Partial<SyncState> {
  const next = { ...patch }
  delete next.revision
  delete next.updatedAt
  return next
}

function normalizeState(state: SyncState): SyncState {
  const slot = withActiveSlot(state, {
    setlistOrder: state.setlistOrder,
    activeSongId: state.activeSongId,
    activeIndex: state.activeIndex ?? -1,
  })
  const theme =
    state.theme === 'stage' ||
    state.theme === 'neon' ||
    state.theme === 'daylight' ||
    state.theme === 'ember'
      ? state.theme
      : 'stage'
  const songs = (state.songs ?? []).map((s) => ({
    ...s,
    feel: s.feel ?? '',
  }))
  return {
    ...state,
    ...slot,
    songs,
    theme,
    suggestions: Array.isArray(state.suggestions) ? state.suggestions : [],
    revision: state.revision ?? 0,
    updatedAt: state.updatedAt ?? Date.now(),
  }
}

function waitOpen(conn: DataConnection, timeoutMs: number) {
  return new Promise<void>((resolve, reject) => {
    if (conn.open) {
      resolve()
      return
    }
    const timer = window.setTimeout(() => reject(new Error('Peer connect timeout')), timeoutMs)
    conn.on('open', () => {
      window.clearTimeout(timer)
      resolve()
    })
    conn.on('error', (err) => {
      window.clearTimeout(timer)
      reject(err)
    })
  })
}
