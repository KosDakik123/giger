import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  ArrowDown,
  ArrowUp,
  GripVertical,
  Pencil,
  Play,
  Plus,
  Trash2,
} from 'lucide-react'
import { useState } from 'react'
import { SongEditorDialog } from '@/components/setlist/SongEditor'
import { Button } from '@/components/ui/button'
import { formatBpm, uid } from '@/lib/utils'
import type { Song } from '@/types'

interface SetlistManagerProps {
  songs: Song[]
  setlistOrder: string[]
  activeSongId: string | null
  activeIndex: number
  onReorder: (order: string[]) => void
  onPlaceAt: (songId: string, slot: number) => void
  onSaveSong: (song: Song) => void
  onDeleteSong: (id: string) => void
  onSelectSong: (id: string) => void
  onJumpToIndex: (index: number) => void
}

const emptySong = (): Song => ({
  id: uid('song'),
  title: '',
  artist: '',
  lyrics: '',
  chords: '',
  key: '',
  tempo: 120,
  notes: '',
})

export function SetlistManager({
  songs,
  setlistOrder,
  activeSongId,
  activeIndex,
  onReorder,
  onPlaceAt,
  onSaveSong,
  onDeleteSong,
  onSelectSong,
  onJumpToIndex,
}: SetlistManagerProps) {
  const [editing, setEditing] = useState<Song | null>(null)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))
  const ordered = setlistOrder
    .map((id) => songs.find((s) => s.id === id))
    .filter(Boolean) as Song[]

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = setlistOrder.indexOf(String(active.id))
    const newIndex = setlistOrder.indexOf(String(over.id))
    if (oldIndex < 0 || newIndex < 0) return
    onReorder(arrayMove(setlistOrder, oldIndex, newIndex))
  }

  const move = (id: string, dir: -1 | 1) => {
    const i = setlistOrder.indexOf(id)
    const j = i + dir
    if (i < 0 || j < 0 || j >= setlistOrder.length) return
    onReorder(arrayMove(setlistOrder, i, j))
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold text-stage-100">Setlist</h2>
          <p className="text-sm text-stage-400">
            Drag to reorder, pick an exact slot, or jump live to any position — all sync to the lobby.
          </p>
        </div>
        <Button className="shrink-0" onClick={() => setEditing(emptySong())}>
          <Plus className="h-4 w-4" /> Add
        </Button>
      </div>

      {ordered.length > 0 ? (
        <div className="glass flex flex-wrap items-center gap-2 rounded-2xl px-3 py-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-stage-400">
            Jump live to
          </span>
          <select
            className="h-10 min-w-0 flex-1 rounded-xl border border-white/10 bg-stage-900 px-3 text-sm text-stage-100"
            value={activeIndex >= 0 ? activeIndex : 0}
            onChange={(e) => onJumpToIndex(Number(e.target.value))}
            aria-label="Jump to setlist position"
          >
            {ordered.map((song, i) => (
              <option key={song.id} value={i}>
                #{i + 1} — {song.title}
              </option>
            ))}
          </select>
          <Button size="sm" onClick={() => onJumpToIndex(activeIndex >= 0 ? activeIndex : 0)}>
            <Play className="h-4 w-4" /> Go
          </Button>
        </div>
      ) : null}

      {ordered.length === 0 ? (
        <div className="glass flex flex-1 flex-col items-center justify-center rounded-3xl px-6 text-center">
          <p className="font-display text-xl font-bold">Empty setlist</p>
          <p className="mt-2 max-w-sm text-sm text-stage-300">
            Add your first tune. Chords can sit above lines or in [brackets].
          </p>
          <Button className="mt-4" onClick={() => setEditing(emptySong())}>
            <Plus className="h-4 w-4" /> Add a song
          </Button>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={setlistOrder} strategy={verticalListSortingStrategy}>
            <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto pb-4">
              {ordered.map((song, index) => (
                <SortableSongRow
                  key={song.id}
                  song={song}
                  index={index}
                  total={ordered.length}
                  active={song.id === activeSongId}
                  onSelect={() => onSelectSong(song.id)}
                  onEdit={() => setEditing(song)}
                  onDelete={() => onDeleteSong(song.id)}
                  onUp={() => move(song.id, -1)}
                  onDown={() => move(song.id, 1)}
                  onPlaceAt={(slot) => onPlaceAt(song.id, slot)}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}

      <SongEditorDialog
        song={editing}
        onClose={() => setEditing(null)}
        onSave={(song) => {
          onSaveSong(song)
          setEditing(null)
        }}
      />
    </div>
  )
}

function SortableSongRow({
  song,
  index,
  total,
  active,
  onSelect,
  onEdit,
  onDelete,
  onUp,
  onDown,
  onPlaceAt,
}: {
  song: Song
  index: number
  total: number
  active: boolean
  onSelect: () => void
  onEdit: () => void
  onDelete: () => void
  onUp: () => void
  onDown: () => void
  onPlaceAt: (slot: number) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: song.id,
  })

  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={`glass flex flex-col gap-2 rounded-2xl p-2 sm:flex-row sm:items-stretch ${
        active ? 'ring-2 ring-amp/70' : ''
      } ${isDragging ? 'opacity-80' : ''}`}
    >
      <div className="flex min-w-0 flex-1 items-stretch gap-2">
        <button
          type="button"
          className="flex w-10 shrink-0 cursor-grab items-center justify-center rounded-xl text-stage-400 active:cursor-grabbing"
          aria-label="Drag to reorder"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-5 w-5" />
        </button>

        <button
          type="button"
          onClick={onSelect}
          className="min-w-0 flex-1 rounded-xl px-1 py-2 text-left"
        >
          <p className="truncate font-display text-base font-bold text-stage-100">
            <span className="mr-2 text-amp-soft">#{index + 1}</span>
            {song.title}
            {active ? (
              <span className="ml-2 rounded-md bg-amp/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amp-soft">
                Live
              </span>
            ) : null}
          </p>
          <p className="truncate text-xs text-stage-400">
            {song.artist} · {song.key || 'Key —'} · {formatBpm(song.tempo)}
          </p>
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-1 px-1 sm:px-0">
        <label className="flex items-center gap-1 text-xs text-stage-400">
          Slot
          <select
            className="h-9 rounded-lg border border-white/10 bg-stage-900 px-2 text-sm text-stage-100"
            value={index}
            onChange={(e) => onPlaceAt(Number(e.target.value))}
            aria-label={`Move ${song.title} to exact slot`}
          >
            {Array.from({ length: total }, (_, i) => (
              <option key={i} value={i}>
                #{i + 1}
              </option>
            ))}
          </select>
        </label>

        <Button
          variant="outline"
          size="sm"
          className="h-9"
          onClick={onSelect}
          aria-label={`Play ${song.title} live`}
        >
          <Play className="h-3.5 w-3.5" /> Live
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          onClick={onUp}
          disabled={index === 0}
          aria-label="Move up"
        >
          <ArrowUp className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          onClick={onDown}
          disabled={index >= total - 1}
          aria-label="Move down"
        >
          <ArrowDown className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={onEdit} aria-label="Edit">
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-rose-glow"
          onClick={onDelete}
          aria-label="Delete"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </li>
  )
}
