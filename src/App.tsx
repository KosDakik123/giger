import { ListMusic, Mic2, Users } from 'lucide-react'
import { LandingScreen } from '@/components/landing/LandingScreen'
import { BandPanel } from '@/components/lobby/BandPanel'
import { MemberEntry } from '@/components/lobby/MemberEntry'
import { LiveViewer } from '@/components/live/LiveViewer'
import { SetlistManager } from '@/components/setlist/SetlistManager'
import { FloatingNotes } from '@/components/decor/FloatingNotes'
import { useGigerSession } from '@/hooks/useGigerSession'
import { cn } from '@/lib/utils'
import type { SessionTab } from '@/types'

export default function App() {
  const s = useGigerSession()

  if (s.screen === 'landing') {
    return (
      <LandingScreen
        busy={s.busy}
        error={s.error}
        theme={s.theme}
        rememberedBands={s.rememberedBands}
        onThemeChange={s.setLobbyTheme}
        onCreate={s.beginCreate}
        onJoin={s.beginJoin}
        onSolo={s.beginSolo}
        onReopenBand={s.reopenBand}
        onForgetBand={s.forgetRememberedBand}
      />
    )
  }

  if (s.screen === 'member-entry' && s.pending) {
    return (
      <MemberEntry
        lobbyName={s.pending.name}
        isLeader={s.pending.intent === 'host' || s.pending.intent === 'solo'}
        busy={s.busy}
        error={s.error}
        rememberedName={
          s.pendingMemory?.roster.find((m) => m.id === s.pendingMemory?.lastSelfId)?.name
        }
        onSubmit={s.enterAsMember}
        onBack={s.backFromMember}
      />
    )
  }

  if (!s.self || !s.state) {
    return (
      <div className="relative flex min-h-dvh items-center justify-center px-6">
        <FloatingNotes />
        <div className="glass relative z-10 max-w-sm rounded-3xl p-6 text-center">
          <p className="font-display text-2xl font-bold text-stage-100">Tuning up…</p>
          <p className="mt-2 text-sm text-stage-400">
            {s.statusDetail || 'Waiting for lobby sync. Keep this tab open.'}
          </p>
          {s.error ? <p className="mt-3 text-sm text-rose-glow">{s.error}</p> : null}
          <button
            type="button"
            className="mt-4 text-sm text-amp-soft underline"
            onClick={s.leave}
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  const tabs: { id: SessionTab; label: string; icon: typeof Mic2 }[] = [
    { id: 'live', label: 'Live', icon: Mic2 },
    { id: 'setlist', label: 'Setlist', icon: ListMusic },
    { id: 'band', label: 'Band', icon: Users },
  ]

  return (
    <div className="mx-auto flex h-dvh w-full max-w-5xl flex-col px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 sm:px-5">
      <header className="mb-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display text-2xl font-extrabold tracking-tight text-stage-100">
            GIGer
          </p>
          <p className="truncate text-xs text-stage-400">
            {s.state.lobby.name}
            {s.self.isLeader ? ' · Leader' : ''} · {s.status}
          </p>
        </div>
        <div className="glass hidden items-center gap-1 rounded-2xl p-1 sm:flex">
          {tabs.map((t) => (
            <TabButton
              key={t.id}
              active={s.tab === t.id}
              label={t.label}
              icon={t.icon}
              onClick={() => s.setTab(t.id)}
            />
          ))}
        </div>
      </header>

      <main className="min-h-0 flex-1">
        {s.tab === 'live' ? (
          <LiveViewer
            song={s.activeSong}
            songs={s.state.songs}
            setlistOrder={s.state.setlistOrder}
            suggestions={s.state.suggestions ?? []}
            scrollRatio={s.state.scrollRatio}
            showChords={s.state.showChords}
            autoScroll={s.state.autoScroll}
            self={s.self}
            reacting={s.reacting}
            onShowChords={(v) => s.publish({ showChords: v })}
            onAutoScroll={(v) => s.publish({ autoScroll: v })}
            onScrollRatio={s.setScrollRatio}
            onPrev={() => s.shiftSong(-1)}
            onNext={() => s.shiftSong(1)}
            onJumpToIndex={s.jumpToIndex}
            onToggleSuggestion={s.suggestSong}
            onPlaySuggestion={s.selectSong}
          />
        ) : null}

        {s.tab === 'setlist' ? (
          <SetlistManager
            songs={s.state.songs}
            setlistOrder={s.state.setlistOrder}
            activeSongId={s.state.activeSongId}
            activeIndex={s.state.activeIndex}
            suggestions={s.state.suggestions ?? []}
            self={s.self}
            onReorder={s.reorderSetlist}
            onPlaceAt={s.placeSongAt}
            onSaveSong={s.saveSong}
            onDeleteSong={s.deleteSong}
            onSelectSong={s.selectSong}
            onJumpToIndex={s.jumpToIndex}
            onSuggestSong={s.suggestSong}
            onClearSuggestion={s.clearSuggestion}
          />
        ) : null}

        {s.tab === 'band' ? (
          <BandPanel
            members={s.state.members}
            selfId={s.self.id}
            lobbyName={s.state.lobby.name}
            pin={s.state.lobby.pin}
            status={s.status}
            statusDetail={s.statusDetail}
            theme={s.theme}
            onThemeChange={s.setLobbyTheme}
            onLeave={s.leave}
          />
        ) : null}
      </main>

      <nav className="glass mt-3 grid grid-cols-3 gap-1 rounded-2xl p-1 sm:hidden">
        {tabs.map((t) => (
          <TabButton
            key={t.id}
            active={s.tab === t.id}
            label={t.label}
            icon={t.icon}
            onClick={() => s.setTab(t.id)}
          />
        ))}
      </nav>
    </div>
  )
}

function TabButton({
  active,
  label,
  icon: Icon,
  onClick,
}: {
  active: boolean
  label: string
  icon: typeof Mic2
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex h-12 items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold transition',
        active ? 'bg-amp text-stage-950' : 'text-stage-400 hover:text-stage-100',
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  )
}
