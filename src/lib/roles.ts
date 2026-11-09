import type { AvatarId, Role } from '@/types'

export const ROLES: Role[] = ['Guitar', 'Vocals', 'Drums', 'Bass', 'Keys', 'Other']

export const AVATARS: AvatarId[] = [
  'spark-fox',
  'moon-cat',
  'amp-bear',
  'wave-bird',
  'neon-bunny',
  'star-owl',
]

export const ROLE_FLAVOR: Record<
  Role,
  { title: string; description: string; accent: string }
> = {
  Guitar: {
    title: 'Shred King',
    description: 'Turns quiet verses into fireworks and never met a solo they didn’t like.',
    accent: '#ff8a3d',
  },
  Vocals: {
    title: 'Vocal Alchemist',
    description: 'Transmutes coffee breath into chorus gold. Mic stands bow in respect.',
    accent: '#ff5d8f',
  },
  Drums: {
    title: 'The Beat Master',
    description: 'Keeps the universe on tempo. Sticks optional, groove mandatory.',
    accent: '#3dffc0',
  },
  Bass: {
    title: 'Low-End Wizard',
    description: 'Casts rumble spells that make the floor remember every chorus.',
    accent: '#7b6cff',
  },
  Keys: {
    title: 'Ivory Stormcaller',
    description: 'Paints pads and punches that lift the whole stage into orbit.',
    accent: '#ffb27a',
  },
  Other: {
    title: 'Wildcard Virtuoso',
    description: 'Tambourine? Sax? Lights? Chaos? Yes. The band’s secret sauce.',
    accent: '#8affd9',
  },
}

export function avatarForRole(role: Role): AvatarId {
  const map: Record<Role, AvatarId> = {
    Guitar: 'spark-fox',
    Vocals: 'moon-cat',
    Drums: 'amp-bear',
    Bass: 'wave-bird',
    Keys: 'neon-bunny',
    Other: 'star-owl',
  }
  return map[role]
}
