import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function uid(prefix = 'id') {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`
}

/** Stable PeerJS host id from lobby credentials (alphanumeric, PeerJS-safe). */
export async function lobbyPeerId(name: string, pin: string): Promise<string> {
  const raw = `${name.trim().toLowerCase()}::${pin.trim()}`
  const data = new TextEncoder().encode(raw)
  const digest = await crypto.subtle.digest('SHA-256', data)
  const hex = [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 28)
  return `bend-${hex}`
}

export function formatBpm(bpm?: number | null) {
  if (!bpm) return '—'
  return `${bpm} BPM`
}
