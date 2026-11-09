import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Crown } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { MemberAvatar } from '@/components/avatars/MemberAvatar'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { parseChordedLyrics } from '@/lib/lyrics'
import { formatBpm } from '@/lib/utils'
import { ROLE_FLAVOR } from '@/lib/roles'
import type { Member, Song } from '@/types'

interface LiveViewerProps {
  song: Song | null
  songs: Song[]
  setlistOrder: string[]
  scrollRatio: number
  showChords: boolean
  autoScroll: boolean
  self: Member
  reacting: boolean
  onShowChords: (v: boolean) => void
  onAutoScroll: (v: boolean) => void
  onScrollRatio: (ratio: number) => void
  onPrev: () => void
  onNext: () => void
  onJumpToIndex: (index: number) => void
}

export function LiveViewer({
  song,
  songs,
  setlistOrder,
  scrollRatio,
  showChords,
  autoScroll,
  self,
  reacting,
  onShowChords,
  onAutoScroll,
  onScrollRatio,
  onPrev,
  onNext,
  onJumpToIndex,
}: LiveViewerProps) {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const applyingRemote = useRef(false)
  const [flash, setFlash] = useState(false)
  const ordered = setlistOrder
    .map((id) => songs.find((s) => s.id === id))
    .filter(Boolean) as Song[]
  const index = song ? ordered.findIndex((s) => s.id === song.id) : -1
  const lines = song ? parseChordedLyrics(song.lyrics) : []

  useEffect(() => {
    setFlash(true)
    const t = window.setTimeout(() => setFlash(false), 700)
    return () => window.clearTimeout(t)
  }, [song?.id])

  useEffect(() => {
    const el = scrollerRef.current
    if (!el) return
    const max = el.scrollHeight - el.clientHeight
    if (max <= 0) return
    applyingRemote.current = true
    el.scrollTop = scrollRatio * max
    window.requestAnimationFrame(() => {
      applyingRemote.current = false
    })
  }, [scrollRatio, song?.id])

  useEffect(() => {
    if (!autoScroll || !song) return
    const el = scrollerRef.current
    if (!el) return
    const id = window.setInterval(() => {
      const max = el.scrollHeight - el.clientHeight
      if (max <= 0) return
      const next = Math.min(1, el.scrollTop / max + 0.004)
      el.scrollTop = next * max
      onScrollRatio(next)
    }, 80)
    return () => window.clearInterval(id)
  }, [autoScroll, song?.id, onScrollRatio])

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="glass flex items-center justify-between gap-3 rounded-2xl px-3 py-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <MemberAvatar id={self.avatarId} size={40} reacting={reacting || flash} />
            <div className="min-w-0">
              <p className="truncate text-xs text-stage-400">
                {self.isLeader ? (
                  <span className="inline-flex items-center gap-1 text-amp-soft">
                    <Crown className="h-3 w-3" /> Leader
                  </span>
                ) : (
                  ROLE_FLAVOR[self.role].title
                )}
              </p>
              <p className="truncate font-display text-sm font-bold text-white">
                {song ? song.title : 'No song selected'}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Switch checked={showChords} onCheckedChange={onShowChords} id="chords" />
            <Label htmlFor="chords" className="hidden text-xs sm:inline">
              Chords
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={autoScroll} onCheckedChange={onAutoScroll} id="auto" />
            <Label htmlFor="auto" className="hidden text-xs sm:inline">
              Auto
            </Label>
          </div>
        </div>
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden rounded-3xl border border-white/10 bg-black/45 stage-grid">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-amp/10 to-transparent"
          aria-hidden
        />
        <AnimatePresence mode="wait">
          <motion.div
            key={song?.id ?? 'empty'}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.28 }}
            className="h-full"
          >
            {!song ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
                <p className="font-display text-2xl font-bold text-white">Stage is quiet</p>
                <p className="max-w-sm text-sm text-stage-300">
                  Add songs in the Setlist tab or pick one from the preset list to light up the
                  lyrics wall.
                </p>
              </div>
            ) : (
              <div
                ref={scrollerRef}
                className="h-full overflow-y-auto px-4 py-8 sm:px-8"
                onScroll={(e) => {
                  if (applyingRemote.current) return
                  const el = e.currentTarget
                  const max = el.scrollHeight - el.clientHeight
                  if (max <= 0) return
                  onScrollRatio(el.scrollTop / max)
                }}
              >
                <div className="mb-8 text-center">
                  <h2 className="font-display text-3xl font-extrabold tracking-tight text-white sm:text-5xl">
                    {song.title}
                  </h2>
                  <p className="mt-2 text-sm text-stage-300 sm:text-base">
                    {song.artist} · {song.key || '—'} · {formatBpm(song.tempo)}
                  </p>
                  {song.notes ? (
                    <p className="mx-auto mt-3 max-w-xl rounded-xl bg-white/5 px-3 py-2 text-sm text-amp-soft">
                      {song.notes}
                    </p>
                  ) : null}
                </div>

                <div className="mx-auto max-w-3xl space-y-3 pb-16 font-sans">
                  {lines.map((line, i) =>
                    line.isSection ? (
                      <p
                        key={i}
                        className="pt-4 text-xs font-bold uppercase tracking-[0.2em] text-neon-soft/80"
                      >
                        {line.text}
                      </p>
                    ) : (
                      <div key={i} className="leading-tight">
                        {showChords && line.chords ? (
                          <pre className="overflow-x-auto font-sans text-sm font-semibold text-amp sm:text-base">
                            {line.chords}
                          </pre>
                        ) : null}
                        <p
                          className={`whitespace-pre-wrap text-xl font-semibold tracking-wide text-stage-100 sm:text-3xl ${
                            !line.text ? 'h-4' : ''
                          }`}
                        >
                          {line.text || ' '}
                        </p>
                      </div>
                    ),
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="grid grid-cols-[1fr_minmax(0,1.4fr)_1fr] items-center gap-2">
        <Button variant="secondary" onClick={onPrev} disabled={index <= 0}>
          <ChevronLeft className="h-5 w-5" /> Prev
        </Button>
        <label className="flex min-w-0 flex-col items-stretch gap-1">
          <span className="text-center text-[10px] font-semibold uppercase tracking-wide text-stage-400">
            Exact slot
          </span>
          <select
            className="h-12 w-full truncate rounded-xl border border-white/10 bg-stage-900 px-2 text-sm font-semibold text-white"
            value={index >= 0 ? index : 0}
            disabled={ordered.length === 0}
            onChange={(e) => onJumpToIndex(Number(e.target.value))}
            aria-label="Jump to exact setlist position"
          >
            {ordered.length === 0 ? (
              <option value={0}>No songs</option>
            ) : (
              ordered.map((s, i) => (
                <option key={s.id} value={i}>
                  #{i + 1}/{ordered.length} — {s.title}
                </option>
              ))
            )}
          </select>
        </label>
        <Button onClick={onNext} disabled={index < 0 || index >= ordered.length - 1}>
          Next <ChevronRight className="h-5 w-5" />
        </Button>
      </div>
    </div>
  )
}
