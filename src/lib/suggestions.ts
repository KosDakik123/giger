import type { Member, SongSuggestion } from '@/types'

/** Toggle or add a suggestion for songId from this member. */
export function toggleSuggestion(
  suggestions: SongSuggestion[],
  songId: string,
  member: Member,
): SongSuggestion[] {
  const now = Date.now()
  const existing = suggestions.find((s) => s.songId === songId)
  if (!existing) {
    return [
      ...suggestions,
      {
        songId,
        backerIds: [member.id],
        backerNames: [member.name],
        updatedAt: now,
      },
    ].sort(byHeat)
  }

  const already = existing.backerIds.includes(member.id)
  let next: SongSuggestion
  if (already) {
    const backerIds = existing.backerIds.filter((id) => id !== member.id)
    const nameById = new Map(existing.backerIds.map((id, i) => [id, existing.backerNames[i] ?? '']))
    const cleanedNames = backerIds.map((id) => nameById.get(id) || 'Member')
    if (backerIds.length === 0) {
      return suggestions.filter((s) => s.songId !== songId).sort(byHeat)
    }
    next = { ...existing, backerIds, backerNames: cleanedNames, updatedAt: now }
  } else {
    next = {
      ...existing,
      backerIds: [...existing.backerIds, member.id],
      backerNames: [...existing.backerNames, member.name],
      updatedAt: now,
    }
  }

  return suggestions.map((s) => (s.songId === songId ? next : s)).sort(byHeat)
}

function byHeat(a: SongSuggestion, b: SongSuggestion) {
  if (b.backerIds.length !== a.backerIds.length) return b.backerIds.length - a.backerIds.length
  return b.updatedAt - a.updatedAt
}

export function formatBackers(names: string[]) {
  if (names.length === 0) return ''
  if (names.length === 1) return `${names[0]} wants this next`
  if (names.length === 2) return `${names[0]} & ${names[1]} want this next`
  const head = names.slice(0, -1).join(', ')
  return `${head} & ${names[names.length - 1]} want this next`
}
