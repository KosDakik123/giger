import type { SyncState } from '@/types'

/** Keep activeIndex aligned with activeSongId after any order/selection change. */
export function withActiveSlot(
  state: Pick<SyncState, 'setlistOrder' | 'activeSongId' | 'activeIndex'>,
  overrides: Partial<Pick<SyncState, 'setlistOrder' | 'activeSongId' | 'activeIndex'>> = {},
): Pick<SyncState, 'setlistOrder' | 'activeSongId' | 'activeIndex'> {
  const setlistOrder = overrides.setlistOrder ?? state.setlistOrder
  let activeSongId =
    overrides.activeSongId !== undefined ? overrides.activeSongId : state.activeSongId
  let activeIndex =
    overrides.activeIndex !== undefined ? overrides.activeIndex : state.activeIndex

  if (overrides.activeIndex !== undefined && overrides.activeSongId === undefined) {
    const clamped = clampIndex(activeIndex, setlistOrder.length)
    activeIndex = clamped
    activeSongId = setlistOrder[clamped] ?? null
  } else if (activeSongId) {
    const found = setlistOrder.indexOf(activeSongId)
    if (found >= 0) {
      activeIndex = found
    } else {
      activeIndex = clampIndex(activeIndex, setlistOrder.length)
      activeSongId = setlistOrder[activeIndex] ?? null
    }
  } else if (setlistOrder.length > 0) {
    activeIndex = clampIndex(activeIndex, setlistOrder.length)
    activeSongId = setlistOrder[activeIndex] ?? setlistOrder[0] ?? null
    activeIndex = activeSongId ? setlistOrder.indexOf(activeSongId) : -1
  } else {
    activeSongId = null
    activeIndex = -1
  }

  return { setlistOrder, activeSongId, activeIndex }
}

export function clampIndex(index: number, length: number) {
  if (length <= 0) return -1
  if (!Number.isFinite(index)) return 0
  return Math.max(0, Math.min(length - 1, Math.trunc(index)))
}

/** Move a song id to an exact 0-based slot; returns new order. */
export function moveSongToSlot(order: string[], songId: string, slot: number): string[] {
  const from = order.indexOf(songId)
  if (from < 0) return order
  const next = [...order]
  next.splice(from, 1)
  const to = clampIndex(slot, next.length + 1)
  // After removal, valid insert indices are 0..next.length
  const insertAt = Math.max(0, Math.min(next.length, to))
  next.splice(insertAt, 0, songId)
  return next
}
