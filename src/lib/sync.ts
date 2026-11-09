import Peer, { type DataConnection } from 'peerjs'
import type { ControlMessage, Member, SyncState } from '@/types'

export type SyncStatus = 'idle' | 'connecting' | 'connected' | 'hosting' | 'solo' | 'error'

export interface SyncHandlers {
  onStatus: (status: SyncStatus, detail?: string) => void
  onState: (state: SyncState) => void
  onMembersHint?: (count: number) => void
}

/**
 * PeerJS lobby mesh: host owns authoritative state; guests send patches.
 * Falls back to local-only when the broker is unreachable.
 */
export class LobbySync {
  private peer: Peer | null = null
  private connections = new Map<string, DataConnection>()
  private mode: 'host' | 'guest' | 'solo' = 'solo'
  private self: Member | null = null
  private state: SyncState | null = null
  private handlers: SyncHandlers
  private destroyed = false

  constructor(handlers: SyncHandlers) {
    this.handlers = handlers
  }

  getMode() {
    return this.mode
  }

  async startHost(peerId: string, self: Member, initial: SyncState) {
    this.mode = 'host'
    this.self = self
    this.state = initial
    this.handlers.onStatus('connecting', 'Opening lobby channel…')

    try {
      await this.openPeer(peerId)
      if (this.destroyed) return
      this.handlers.onStatus('hosting', 'Lobby live — share name & PIN')
      this.handlers.onState(this.state)
    } catch (err) {
      console.warn('PeerJS host failed, solo fallback', err)
      this.mode = 'solo'
      this.handlers.onStatus(
        'solo',
        'Could not reach sync broker — practicing solo. Local changes still save.',
      )
      this.handlers.onState(initial)
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
      this.wireConnection(conn)
      await waitOpen(conn, 12000)
      conn.send({ type: 'hello', member: self } satisfies ControlMessage)
      conn.send({ type: 'request-state' } satisfies ControlMessage)
      this.handlers.onStatus('connected', 'Synced with lobby leader')
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
    this.state = initial
    this.handlers.onStatus('solo', 'Solo rehearsal — changes stay on this device')
    this.handlers.onState(initial)
  }

  /** Host / solo apply local mutations and broadcast. Guests send patches upstream. */
  publish(patch: Partial<SyncState>) {
    if (!this.self) return

    if (this.mode === 'guest') {
      this.broadcast({ type: 'patch', patch, fromId: this.self.id })
      return
    }

    if (!this.state) return
    this.state = {
      ...this.state,
      ...patch,
      updatedAt: Date.now(),
      members: patch.members ?? this.state.members,
    }
    this.handlers.onState(this.state)
    this.broadcast({ type: 'full-state', state: this.state })
  }

  replaceState(state: SyncState) {
    this.state = state
    if (this.mode === 'host') {
      this.broadcast({ type: 'full-state', state })
    }
  }

  leave() {
    if (this.self && this.mode === 'guest') {
      this.broadcast({ type: 'goodbye', memberId: this.self.id })
    }
    this.destroy()
  }

  destroy() {
    this.destroyed = true
    for (const conn of this.connections.values()) {
      try {
        conn.close()
      } catch {
        // ignore
      }
    }
    this.connections.clear()
    if (this.peer) {
      try {
        this.peer.destroy()
      } catch {
        // ignore
      }
    }
    this.peer = null
  }

  private openPeer(id?: string) {
    return new Promise<void>((resolve, reject) => {
      const peer = id ? new Peer(id) : new Peer()
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
        const message = err?.type === 'unavailable-id'
          ? 'That lobby is already open somewhere. Close the other tab or pick a new name.'
          : err?.message || 'PeerJS error'
        reject(new Error(message))
      })

      peer.on('connection', (conn) => {
        this.wireConnection(conn)
      })
    })
  }

  private wireConnection(conn: DataConnection) {
    conn.on('open', () => {
      this.connections.set(conn.peer, conn)
      this.handlers.onMembersHint?.(this.connections.size)
      if (this.mode === 'host' && this.state) {
        conn.send({ type: 'full-state', state: this.state } satisfies ControlMessage)
      }
    })

    conn.on('data', (raw) => {
      this.handleMessage(raw as ControlMessage, conn)
    })

    conn.on('close', () => {
      this.connections.delete(conn.peer)
      this.handlers.onMembersHint?.(this.connections.size)
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
          this.publish({ members })
        }
        break
      }
      case 'goodbye': {
        if (this.mode === 'host' && this.state) {
          this.publish({
            members: this.state.members.filter((m) => m.id !== msg.memberId),
          })
        }
        break
      }
      case 'request-state': {
        if (this.mode === 'host' && this.state) {
          conn.send({ type: 'full-state', state: this.state } satisfies ControlMessage)
        }
        break
      }
      case 'full-state': {
        this.state = msg.state
        this.handlers.onState(msg.state)
        break
      }
      case 'patch': {
        if (this.mode === 'host' && this.state) {
          // Guests may request control — host merges & rebroadcasts
          const nextMembers =
            msg.patch.members ??
            this.state.members
          this.publish({ ...msg.patch, members: nextMembers })
        }
        break
      }
      default:
        break
    }
  }

  private broadcast(msg: ControlMessage) {
    for (const conn of this.connections.values()) {
      if (conn.open) {
        try {
          conn.send(msg)
        } catch {
          // ignore flaky peers
        }
      }
    }
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
