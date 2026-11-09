import { HandMetal, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatBackers } from '@/lib/suggestions'
import type { Member, Song, SongSuggestion } from '@/types'

interface SuggestionsQueueProps {
  suggestions: SongSuggestion[]
  songs: Song[]
  self: Member
  compact?: boolean
  onToggle: (songId: string) => void
  onPlay?: (songId: string) => void
  onClear?: (songId: string) => void
}

export function SuggestionsQueue({
  suggestions,
  songs,
  self,
  compact = false,
  onToggle,
  onPlay,
  onClear,
}: SuggestionsQueueProps) {
  if (suggestions.length === 0) {
    return (
      <div className={`glass rounded-2xl ${compact ? 'px-3 py-2' : 'p-4'}`}>
        <p className="text-xs font-semibold uppercase tracking-wide text-stage-400">Next up votes</p>
        <p className={`text-sm text-stage-400 ${compact ? 'mt-0.5' : 'mt-1'}`}>
          Nobody’s lobbying yet — tap Want next on a song.
        </p>
      </div>
    )
  }

  return (
    <div className={`glass rounded-2xl ${compact ? 'px-3 py-2' : 'p-4'}`}>
      <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-amp-soft">
        <HandMetal className="h-3.5 w-3.5" /> Next up votes
      </p>
      <ul className="space-y-2">
        {suggestions.map((s) => {
          const song = songs.find((x) => x.id === s.songId)
          if (!song) return null
          const mine = s.backerIds.includes(self.id)
          return (
            <li
              key={s.songId}
              className="flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-stage-900/40 px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-sm font-bold text-stage-100">
                  {song.title}
                  <span className="ml-2 text-xs font-semibold text-neon-soft">
                    ×{s.backerIds.length}
                  </span>
                </p>
                <p className="truncate text-xs text-stage-400">{formatBackers(s.backerNames)}</p>
              </div>
              <div className="flex gap-1">
                {onPlay ? (
                  <Button size="sm" variant="outline" onClick={() => onPlay(s.songId)}>
                    Play
                  </Button>
                ) : null}
                <Button
                  size="sm"
                  variant={mine ? 'default' : 'secondary'}
                  onClick={() => onToggle(s.songId)}
                >
                  {mine ? 'Voted' : 'Want next'}
                </Button>
                {onClear && self.isLeader ? (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-9 w-9 text-rose-glow"
                    aria-label="Clear suggestion"
                    onClick={() => onClear(s.songId)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                ) : null}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
