import { Crown, LogOut, Radio } from 'lucide-react'
import { MemberAvatar } from '@/components/avatars/MemberAvatar'
import { ThemeSwitcher } from '@/components/theme/ThemeSwitcher'
import { Button } from '@/components/ui/button'
import type { SyncStatus } from '@/lib/sync'
import type { ThemeId } from '@/lib/themes'
import { ROLE_FLAVOR } from '@/lib/roles'
import type { Member } from '@/types'

interface BandPanelProps {
  members: Member[]
  selfId: string
  lobbyName: string
  pin: string
  status: SyncStatus
  statusDetail?: string
  theme: ThemeId
  onThemeChange: (theme: ThemeId) => void
  onLeave: () => void
}

export function BandPanel({
  members,
  selfId,
  lobbyName,
  pin,
  status,
  statusDetail,
  theme,
  onThemeChange,
  onLeave,
}: BandPanelProps) {
  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div>
        <h2 className="font-display text-2xl font-bold text-stage-100">The band</h2>
        <p className="text-sm text-stage-400">
          Lobby <span className="text-amp-soft">{lobbyName}</span> · PIN {pin}
        </p>
      </div>

      <div className="glass flex items-start gap-3 rounded-2xl p-4">
        <div className="mt-0.5 rounded-xl bg-neon/15 p-2 text-neon">
          <Radio className="h-5 w-5" />
        </div>
        <div>
          <p className="font-semibold text-stage-100">{statusLabel(status)}</p>
          <p className="text-sm text-stage-400">
            {statusDetail ||
              'Active song, setlist order, scroll, and theme stay synced for everyone in this lobby.'}
          </p>
        </div>
      </div>

      <div className="glass rounded-2xl p-4">
        <ThemeSwitcher theme={theme} onChange={onThemeChange} />
      </div>

      {members.length === 0 ? (
        <div className="glass flex flex-1 items-center justify-center rounded-3xl px-6 text-center">
          <p className="text-sm text-stage-400">No members yet — share the lobby name and PIN.</p>
        </div>
      ) : (
        <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto">
          {members.map((m) => {
            const flavor = ROLE_FLAVOR[m.role]
            return (
              <li key={m.id} className="glass flex items-center gap-3 rounded-2xl p-3">
                <MemberAvatar id={m.avatarId} size={52} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display font-bold text-stage-100">
                    {m.name}
                    {m.id === selfId ? (
                      <span className="ml-2 text-xs font-medium text-stage-400">(you)</span>
                    ) : null}
                  </p>
                  <p className="truncate text-sm" style={{ color: flavor.accent }}>
                    {flavor.title} · {m.role}
                  </p>
                  <p className="truncate text-xs text-stage-400">{flavor.description}</p>
                </div>
                {m.isLeader ? (
                  <span className="inline-flex items-center gap-1 rounded-lg bg-amp/15 px-2 py-1 text-xs font-semibold text-amp-soft">
                    <Crown className="h-3 w-3" /> Leader
                  </span>
                ) : null}
              </li>
            )
          })}
        </ul>
      )}

      <Button variant="secondary" onClick={onLeave}>
        <LogOut className="h-4 w-4" /> Leave lobby
      </Button>
    </div>
  )
}

function statusLabel(status: SyncStatus) {
  switch (status) {
    case 'hosting':
      return 'Hosting lobby'
    case 'connected':
      return 'Synced'
    case 'connecting':
      return 'Connecting'
    case 'solo':
      return 'Solo mode'
    case 'error':
      return 'Sync issue'
    default:
      return 'Idle'
  }
}
