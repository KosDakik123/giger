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
import { ArrowDown, ArrowUp, GripVertical, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { SongEditorDialog } from '@/components/setlist/SongEditor'
import { Button } from '@/components/ui/button'
import { formatBpm, uid } from '@/lib/utils'
import type { Song } from '@/types'

interface SetlistManagerProps {
  songs: Song[]
  setlistOrder: string[]
  activeSongId: string | null
  onReorder: (order: string[]) => void
  onSaveSong: (song: Song) => void
  onDeleteSong: (id: string) => void
  onSelectSong: (id: string) => void
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
  onReorder,
  onSaveSong,
  onDeleteSong,
  onSelectSong,
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
          <h2 className="font-display text-2xl font-bold text-white">Setlist</h2>
          <p className="text-sm text-stage-400">
            Drag to reorder, or use the arrows. Tap a song to make it live.
          </p>
        </div>
        <Button className="shrink-0" onClick={() => setEditing(emptySong())}>
          <Plus className="h-4 w-4" /> Add
        </Button>
      </div>

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
      className={`glass flex items-stretch gap-2 rounded-2xl p-2 ${
        active ? 'ring-2 ring-amp/70' : ''
      } ${isDragging ? 'opacity-80' : ''}`}
    >
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
        <p className="truncate font-display text-base font-bold text-white">
          <span className="mr-2 text-stage-400">{index + 1}.</span>
          {song.title}
        </p>
        <p className="truncate text-xs text-stage-400">
          {song.artist} · {song.key || 'Key —'} · {formatBpm(song.tempo)}
        </p>
      </button>

      <div className="flex flex-col gap-1">
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
      </div>

      <div className="flex flex-col gap-1">
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
