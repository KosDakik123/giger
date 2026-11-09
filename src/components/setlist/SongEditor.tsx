import { useEffect, useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { Song } from '@/types'

export function SongEditorDialog({
  song,
  onClose,
  onSave,
}: {
  song: Song | null
  onClose: () => void
  onSave: (song: Song) => void
}) {
  const [draft, setDraft] = useState<Song | null>(null)

  useEffect(() => {
    setDraft(song ? { ...song } : null)
  }, [song])

  return (
    <Dialog
      open={Boolean(song)}
      onOpenChange={(v) => {
        if (!v) onClose()
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{song?.title?.trim() ? 'Edit song' : 'Add song'}</DialogTitle>
          <DialogDescription>
            Put chords on the line above lyrics, or inline like [G]hello. Stage view toggles chord
            visibility.
          </DialogDescription>
        </DialogHeader>

        {draft ? (
          <div className="space-y-3">
            <Field label="Title">
              <Input
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                placeholder="Song title"
              />
            </Field>
            <Field label="Artist">
              <Input
                value={draft.artist}
                onChange={(e) => setDraft({ ...draft, artist: e.target.value })}
                placeholder="Artist or band"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Key">
                <Input
                  value={draft.key}
                  onChange={(e) => setDraft({ ...draft, key: e.target.value })}
                  placeholder="Em"
                />
              </Field>
              <Field label="Tempo (BPM)">
                <Input
                  type="number"
                  value={draft.tempo || ''}
                  onChange={(e) => setDraft({ ...draft, tempo: Number(e.target.value) || 0 })}
                  placeholder="120"
                />
              </Field>
            </div>
            <Field label="Chords summary">
              <Input
                value={draft.chords}
                onChange={(e) => setDraft({ ...draft, chords: e.target.value })}
                placeholder="Em C G D"
              />
            </Field>
            <Field label="Lyrics (with chords)">
              <Textarea
                className="min-h-40 font-mono text-sm"
                value={draft.lyrics}
                onChange={(e) => setDraft({ ...draft, lyrics: e.target.value })}
                placeholder={'[Verse]\nEm          C\nYour lyric line here'}
              />
            </Field>
            <Field label="Notes">
              <Textarea
                value={draft.notes}
                onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                placeholder="Cue lights, watch tempo, etc."
              />
            </Field>
            <Button
              className="w-full"
              onClick={() => {
                if (!draft.title.trim()) return
                onSave({ ...draft, title: draft.title.trim() })
              }}
            >
              Save song
            </Button>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  )
}
