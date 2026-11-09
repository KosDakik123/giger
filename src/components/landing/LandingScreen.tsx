import { motion } from 'framer-motion'
import { Headphones, KeyRound, Plus, Users } from 'lucide-react'
import { useState } from 'react'
import { FloatingNotes } from '@/components/decor/FloatingNotes'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface LandingScreenProps {
  busy: boolean
  error: string | null
  onCreate: (name: string, pin: string) => void
  onJoin: (name: string, pin: string) => void
  onSolo: () => void
}

export function LandingScreen({ busy, error, onCreate, onJoin, onSolo }: LandingScreenProps) {
  const [mode, setMode] = useState<'create' | 'join'>('create')
  const [name, setName] = useState('')
  const [pin, setPin] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)

  const submit = () => {
    setLocalError(null)
    const n = name.trim()
    const p = pin.trim()
    if (n.length < 2) {
      setLocalError('Lobby name needs at least 2 characters.')
      return
    }
    if (!/^\d{4,8}$/.test(p)) {
      setLocalError('PIN must be 4–8 digits.')
      return
    }
    if (mode === 'create') onCreate(n, p)
    else onJoin(n, p)
  }

  return (
    <div className="relative mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center px-5 py-10">
      <FloatingNotes />

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: 'easeOut' }}
        className="relative z-10"
      >
        <p className="mb-3 text-sm font-medium uppercase tracking-[0.22em] text-amp-soft/90">
          Live rehearsal · stage sync
        </p>
        <h1 className="font-display text-6xl font-extrabold leading-none tracking-tight text-white sm:text-7xl">
          BEND
        </h1>
        <p className="mt-4 max-w-md text-base leading-relaxed text-stage-200">
          One lobby. One setlist. Lyrics that stay in sync across every phone on stage — no app
          install, just the browser.
        </p>

        <div className="mt-8 glass rounded-3xl p-5 shadow-2xl">
          <div className="mb-5 grid grid-cols-2 gap-2 rounded-2xl bg-stage-900/70 p-1">
            <button
              type="button"
              className={`flex h-11 items-center justify-center gap-2 rounded-xl text-sm font-semibold transition ${
                mode === 'create' ? 'bg-amp text-stage-950' : 'text-stage-300 hover:text-white'
              }`}
              onClick={() => setMode('create')}
            >
              <Plus className="h-4 w-4" /> Create
            </button>
            <button
              type="button"
              className={`flex h-11 items-center justify-center gap-2 rounded-xl text-sm font-semibold transition ${
                mode === 'join' ? 'bg-amp text-stage-950' : 'text-stage-300 hover:text-white'
              }`}
              onClick={() => setMode('join')}
            >
              <Users className="h-4 w-4" /> Join
            </button>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="lobby-name">Lobby name</Label>
              <Input
                id="lobby-name"
                placeholder="Friday Night Rehearsal"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lobby-pin">Password / PIN</Label>
              <div className="relative">
                <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stage-400" />
                <Input
                  id="lobby-pin"
                  className="pl-10"
                  inputMode="numeric"
                  placeholder="4–8 digits"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
                  autoComplete="off"
                />
              </div>
            </div>

            {(localError || error) && (
              <div
                role="alert"
                className="rounded-xl border border-rose-glow/30 bg-rose-glow/10 px-3 py-2 text-sm text-rose-glow"
              >
                {localError || error}
              </div>
            )}

            <Button className="w-full animate-pulse-glow" size="lg" disabled={busy} onClick={submit}>
              {busy ? 'Connecting…' : mode === 'create' ? 'Create lobby' : 'Join lobby'}
            </Button>
          </div>
        </div>

        <div className="mt-5 flex flex-col items-center gap-3">
          <Button variant="ghost" className="text-stage-300" disabled={busy} onClick={onSolo}>
            <Headphones className="h-4 w-4" /> Practice solo (no sync)
          </Button>
          <p className="text-center text-xs text-stage-400">
            Works on iOS, Android, and desktop browsers. Sync uses PeerJS when online; solo mode
            always works offline with localStorage.
          </p>
        </div>
      </motion.div>
    </div>
  )
}
