import type { ThemeId } from '@/types'

export type { ThemeId }

export interface ThemeOption {
  id: ThemeId
  label: string
  blurb: string
}

export const THEMES: ThemeOption[] = [
  {
    id: 'stage',
    label: 'Stage Dark',
    blurb: 'High-contrast amp glow — default for gigs',
  },
  {
    id: 'neon',
    label: 'Neon Pit',
    blurb: 'Cyan / magenta club lights',
  },
  {
    id: 'daylight',
    label: 'Daylight',
    blurb: 'Bright rehearsal room — easier outdoors',
  },
  {
    id: 'ember',
    label: 'Ember',
    blurb: 'Warm charcoal with red-hot accents',
  },
]

export const DEFAULT_THEME: ThemeId = 'stage'
export const THEME_STORAGE_KEY = 'giger.theme.v1'

export function isThemeId(value: unknown): value is ThemeId {
  return value === 'stage' || value === 'neon' || value === 'daylight' || value === 'ember'
}

export function applyTheme(theme: ThemeId) {
  document.documentElement.dataset.theme = theme
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    // ignore
  }
}

export function loadStoredTheme(): ThemeId {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY)
    if (isThemeId(raw)) return raw
  } catch {
    // ignore
  }
  return DEFAULT_THEME
}
