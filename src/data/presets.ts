import { uid } from '@/lib/utils'
import type { Song } from '@/types'

/** Built-in rehearsal set — realistic covers with chorded lyric samples. */
export function createPresetSongs(): Song[] {
  return [
    {
      id: uid('song'),
      title: 'Midnight Drive',
      artist: 'Neon Alley',
      key: 'Em',
      tempo: 118,
      feel: 'straight 4/4 · cruise',
      notes: 'Open with soft pad; big chorus crash on bar 1.',
      chords: 'Em  C  G  D',
      lyrics: `[Verse 1]
Em          C
Streetlights blur like watercolor rain
G                D
We chase the quiet out of this town again
Em           C
Your laugh cuts through the dashboard hum
G                 D
Two hearts synced to a distant drum

[Chorus]
Em     C           G      D
Take the midnight drive with me
Em      C            G         D
Leave the map, trust the melody
Em       C         G       D
Windows down, the city sleeps
Em      C           G      D
We write ourselves into the beat`,
    },
    {
      id: uid('song'),
      title: 'Coffee & Feedback',
      artist: 'Stage Left Collective',
      key: 'A',
      tempo: 132,
      feel: 'driving 4/4 · push',
      notes: 'Talk break before bridge. Watch tempo — drummer likes to push.',
      chords: 'A  D  E  F#m',
      lyrics: `[Verse 1]
A                 D
Half a cup and a half-baked plan
E                    F#m
Amp on standby like a restless fan
A                 D
You say “one more” and I already know
E                      F#m
We’re late for soundcheck but we still go

[Chorus]
A          D
Coffee and feedback, that’s our prayer
E             F#m
Messy and perfect, we’re almost there
A            D
Count us in loud, don’t count us out
E              F#m
This is what rehearsal’s about`,
    },
    {
      id: uid('song'),
      title: 'Harbor Lights',
      artist: 'Salt & Steel',
      key: 'C',
      tempo: 96,
      feel: 'ballad · soft 6/8',
      notes: 'Acoustic vibe. Keys swell on last chorus.',
      chords: 'C  Am  F  G',
      lyrics: `[Verse 1]
C              Am
Dockside neon kissing the tide
F                 G
We hum the chorus we used to hide
C               Am
Old guitar case, new resolve
F                  G
Tonight the quiet problems dissolve

[Chorus]
C          Am
Harbor lights, hold us close
F              G
Sing the nights we miss the most
C           Am
Soft and slow, loud and true
F               G
Every song leads back to you`,
    },
    {
      id: uid('song'),
      title: 'Static Heart',
      artist: 'Voltage Parade',
      key: 'Bm',
      tempo: 140,
      feel: 'straight 4/4 · high energy',
      notes: 'Mute guitars on verse 2. Full send on final chorus.',
      chords: 'Bm  G  D  A',
      lyrics: `[Verse 1]
Bm            G
Radio ghosts in the hallway air
D                 A
We tune them out like we don’t care
Bm             G
But the chorus finds us anyway
D                A
Static heart, clear as day

[Chorus]
Bm      G         D      A
Can you hear that signal rise?
Bm       G          D        A
Through the noise, through the lies
Bm      G        D       A
Turn it up until it breaks
Bm       G         D       A
Static heart, no mistakes`,
    },
    {
      id: uid('song'),
      title: 'Encore Tomorrow',
      artist: 'The Late Call',
      key: 'G',
      tempo: 108,
      feel: 'mid-tempo 4/4 · clap on 2&4',
      notes: 'Closing number. Invite crowd clap on bridge if gigging.',
      chords: 'G  Em  C  D',
      lyrics: `[Verse 1]
G                 Em
Pack the cables, leave the glow
C                    D
We already know how this show goes
G               Em
One more bow, one more rhyme
C                     D
Save the fireworks for next time

[Chorus]
G            Em
Encore tomorrow, not tonight
C                 D
Keep the spark, dim the light
G              Em
We’ll be back when the room feels right
C                D
Encore tomorrow — hold on tight`,
    },
  ]
}

export function defaultSetlistOrder(songs: Song[]): string[] {
  return songs.map((s) => s.id)
}
