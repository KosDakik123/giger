import { Palette } from 'lucide-react'
import { THEMES, type ThemeId } from '@/lib/themes'
import { cn } from '@/lib/utils'

interface ThemeSwitcherProps {
  theme: ThemeId
  onChange: (theme: ThemeId) => void
  compact?: boolean
  className?: string
}

export function ThemeSwitcher({ theme, onChange, compact = false, className }: ThemeSwitcherProps) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {!compact ? (
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-stage-400">
          <Palette className="h-3.5 w-3.5 text-amp-soft" />
          Theme
          <span className="font-normal normal-case tracking-normal text-stage-400/80">
            · syncs with lobby
          </span>
        </div>
      ) : null}
      <div className={cn('grid gap-2', compact ? 'grid-cols-4' : 'grid-cols-2 sm:grid-cols-4')}>
        {THEMES.map((t) => {
          const active = t.id === theme
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onChange(t.id)}
              title={t.blurb}
              className={cn(
                'rounded-xl border px-2 py-2 text-left transition',
                active
                  ? 'border-amp/60 bg-amp/15 ring-1 ring-amp/40'
                  : 'border-white/10 bg-stage-900/50 hover:border-white/25',
              )}
            >
              <span className="mb-1.5 flex gap-1" aria-hidden>
                <Swatch theme={t.id} />
              </span>
              <span
                className={cn(
                  'block text-xs font-semibold',
                  active ? 'text-amp-soft' : 'text-stage-100',
                )}
              >
                {t.label}
              </span>
              {!compact ? (
                <span className="mt-0.5 block text-[10px] leading-snug text-stage-400">{t.blurb}</span>
              ) : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function Swatch({ theme }: { theme: ThemeId }) {
  const palettes: Record<ThemeId, [string, string, string]> = {
    stage: ['#0e0c16', '#ff8a3d', '#3dffc0'],
    neon: ['#0a0b14', '#ff2bd6', '#2ef6ff'],
    daylight: ['#f4f7fb', '#0f7a6b', '#2563eb'],
    ember: ['#1a0e0a', '#ff5a1f', '#ffc14d'],
  }
  const [a, b, c] = palettes[theme]
  return (
    <>
      <span className="h-3 w-3 rounded-full border border-black/20" style={{ background: a }} />
      <span className="h-3 w-3 rounded-full border border-black/20" style={{ background: b }} />
      <span className="h-3 w-3 rounded-full border border-black/20" style={{ background: c }} />
    </>
  )
}
