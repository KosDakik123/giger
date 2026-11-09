import type { AvatarId } from '@/types'
import { cn } from '@/lib/utils'

const palette: Record<AvatarId, { bg: string; ink: string }> = {
  'spark-fox': { bg: '#3a2216', ink: '#ff8a3d' },
  'moon-cat': { bg: '#2a1730', ink: '#ff5d8f' },
  'amp-bear': { bg: '#14271f', ink: '#3dffc0' },
  'wave-bird': { bg: '#1a1738', ink: '#7b6cff' },
  'neon-bunny': { bg: '#2f2214', ink: '#ffb27a' },
  'star-owl': { bg: '#17262a', ink: '#8affd9' },
}

function Face({ id }: { id: AvatarId }) {
  switch (id) {
    case 'spark-fox':
      return (
        <g>
          <ellipse cx="32" cy="36" rx="18" ry="16" fill="currentColor" opacity="0.9" />
          <path d="M16 24 L22 10 L28 24 Z" fill="currentColor" />
          <path d="M36 24 L42 10 L48 24 Z" fill="currentColor" />
          <circle cx="26" cy="34" r="2.2" fill="#0b0a10" />
          <circle cx="38" cy="34" r="2.2" fill="#0b0a10" />
          <path d="M30 40 Q32 43 34 40" stroke="#0b0a10" strokeWidth="1.6" fill="none" />
          <path d="M44 28 L54 22 L48 34 Z" fill="#ffb27a" />
        </g>
      )
    case 'moon-cat':
      return (
        <g>
          <circle cx="32" cy="34" r="16" fill="currentColor" />
          <path d="M20 22 L24 8 L30 22" fill="currentColor" />
          <path d="M34 22 L40 8 L44 22" fill="currentColor" />
          <path d="M22 30 Q32 18 42 30" fill="#0b0a10" opacity="0.2" />
          <circle cx="26" cy="33" r="2" fill="#0b0a10" />
          <circle cx="38" cy="33" r="2" fill="#0b0a10" />
          <path d="M30 39 Q32 42 34 39" stroke="#0b0a10" strokeWidth="1.5" fill="none" />
          <path d="M46 18 Q54 14 52 26" stroke="currentColor" strokeWidth="2" fill="none" />
        </g>
      )
    case 'amp-bear':
      return (
        <g>
          <circle cx="20" cy="20" r="7" fill="currentColor" />
          <circle cx="44" cy="20" r="7" fill="currentColor" />
          <ellipse cx="32" cy="36" rx="17" ry="15" fill="currentColor" />
          <ellipse cx="32" cy="40" rx="8" ry="6" fill="#0b0a10" opacity="0.25" />
          <circle cx="26" cy="33" r="2.2" fill="#0b0a10" />
          <circle cx="38" cy="33" r="2.2" fill="#0b0a10" />
          <circle cx="32" cy="38" r="2" fill="#0b0a10" />
        </g>
      )
    case 'wave-bird':
      return (
        <g>
          <ellipse cx="32" cy="34" rx="16" ry="14" fill="currentColor" />
          <path d="M18 30 Q8 24 14 18 Q22 22 24 28 Z" fill="currentColor" />
          <path d="M42 28 L54 24 L46 36 Z" fill="#ffb27a" />
          <circle cx="28" cy="32" r="2.2" fill="#0b0a10" />
          <path d="M20 42 Q32 50 44 42" stroke="#0b0a10" strokeWidth="2" fill="none" opacity="0.35" />
        </g>
      )
    case 'neon-bunny':
      return (
        <g>
          <ellipse cx="24" cy="16" rx="5" ry="12" fill="currentColor" />
          <ellipse cx="40" cy="16" rx="5" ry="12" fill="currentColor" />
          <circle cx="32" cy="36" r="15" fill="currentColor" />
          <circle cx="26" cy="34" r="2" fill="#0b0a10" />
          <circle cx="38" cy="34" r="2" fill="#0b0a10" />
          <ellipse cx="32" cy="40" rx="3" ry="2" fill="#0b0a10" opacity="0.35" />
          <path d="M48 40 Q58 36 54 48" stroke="currentColor" strokeWidth="3" fill="none" />
        </g>
      )
    case 'star-owl':
    default:
      return (
        <g>
          <ellipse cx="32" cy="36" rx="17" ry="15" fill="currentColor" />
          <polygon points="32,8 36,18 28,18" fill="#ffb27a" />
          <circle cx="24" cy="34" r="5" fill="#0b0a10" opacity="0.25" />
          <circle cx="40" cy="34" r="5" fill="#0b0a10" opacity="0.25" />
          <circle cx="24" cy="34" r="2" fill="#0b0a10" />
          <circle cx="40" cy="34" r="2" fill="#0b0a10" />
          <path d="M28 42 L32 45 L36 42" stroke="#0b0a10" strokeWidth="1.6" fill="none" />
        </g>
      )
  }
}

export function MemberAvatar({
  id,
  size = 56,
  className,
  reacting = false,
}: {
  id: AvatarId
  size?: number
  className?: string
  reacting?: boolean
}) {
  const colors = palette[id]
  return (
    <div
      className={cn(
        'relative inline-flex items-center justify-center rounded-2xl border border-white/10 shadow-lg transition-transform',
        reacting && 'animate-bob',
        className,
      )}
      style={{
        width: size,
        height: size,
        background: colors.bg,
        color: colors.ink,
      }}
      aria-hidden
    >
      <svg viewBox="0 0 64 64" width={size * 0.86} height={size * 0.86}>
        <Face id={id} />
      </svg>
    </div>
  )
}
