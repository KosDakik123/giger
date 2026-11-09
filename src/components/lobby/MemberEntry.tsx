import { motion } from 'framer-motion'
import { useState } from 'react'
import { MemberAvatar } from '@/components/avatars/MemberAvatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AVATARS, ROLE_FLAVOR, ROLES, avatarForRole } from '@/lib/roles'
import type { AvatarId, Role } from '@/types'

interface MemberEntryProps {
  lobbyName: string
  isLeader: boolean
  busy: boolean
  error: string | null
  rememberedName?: string
  onSubmit: (payload: { name: string; role: Role; avatarId: AvatarId }) => void
  onBack: () => void
}

export function MemberEntry({
  lobbyName,
  isLeader,
  busy,
  error,
  rememberedName,
  onSubmit,
  onBack,
}: MemberEntryProps) {
  const [name, setName] = useState(rememberedName ?? '')
  const [role, setRole] = useState<Role>('Guitar')
  const [avatarId, setAvatarId] = useState<AvatarId>(avatarForRole('Guitar'))
  const [localError, setLocalError] = useState<string | null>(null)
  const flavor = ROLE_FLAVOR[role]

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center px-5 py-10">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <p className="text-sm uppercase tracking-[0.18em] text-amp-soft">Entering lobby</p>
        <h1 className="mt-2 font-display text-4xl font-bold text-stage-100">{lobbyName}</h1>
        <p className="mt-2 text-stage-300">
          Pick a name, role, and stage creature. {isLeader ? 'You’re the lobby leader.' : 'Follow the leader’s setlist sync.'}
        </p>

        <div className="mt-6 glass space-y-5 rounded-3xl p-5">
          <div className="space-y-2">
            <Label htmlFor="member-name">Your name</Label>
            <Input
              id="member-name"
              placeholder="Alex"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="nickname"
            />
          </div>

          <div className="space-y-2">
            <Label>Role</Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {ROLES.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => {
                    setRole(r)
                    setAvatarId(avatarForRole(r))
                  }}
                  className={`rounded-xl border px-3 py-3 text-left text-sm font-semibold transition ${
                    role === r
                      ? 'border-amp/50 bg-amp/15 text-amp-soft'
                      : 'border-white/10 bg-stage-900/60 text-stage-200 hover:border-white/20'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-stage-900/50 p-4">
            <p className="font-display text-lg font-bold" style={{ color: flavor.accent }}>
              {flavor.title}
            </p>
            <p className="mt-1 text-sm text-stage-300">{flavor.description}</p>
          </div>

          <div className="space-y-2">
            <Label>Character</Label>
            <div className="flex flex-wrap gap-3">
              {AVATARS.map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setAvatarId(id)}
                  className={`rounded-2xl p-1 transition ${
                    avatarId === id ? 'ring-2 ring-amp scale-105' : 'opacity-70 hover:opacity-100'
                  }`}
                  aria-label={id}
                >
                  <MemberAvatar id={id} size={58} />
                </button>
              ))}
            </div>
          </div>

          {(localError || error) && (
            <div role="alert" className="rounded-xl border border-rose-glow/30 bg-rose-glow/10 px-3 py-2 text-sm text-rose-glow">
              {localError || error}
            </div>
          )}

          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={onBack} disabled={busy}>
              Back
            </Button>
            <Button
              className="flex-[1.4]"
              disabled={busy}
              onClick={() => {
                if (name.trim().length < 1) {
                  setLocalError('Name yourself so the band knows who’s who.')
                  return
                }
                onSubmit({ name: name.trim(), role, avatarId })
              }}
            >
              {busy ? 'Entering…' : 'Enter lobby'}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
