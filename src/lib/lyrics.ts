export interface LyricLine {
  chords: string | null
  text: string
  isSection: boolean
}

/**
 * Parses chorded lyrics:
 * - Lines with only chord tokens above lyric lines
 * - Bracket chords like [C]hello [G]world
 * - Section headers like [Chorus]
 */
export function parseChordedLyrics(raw: string): LyricLine[] {
  const lines = raw.replace(/\r\n/g, '\n').split('\n')
  const out: LyricLine[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? ''
    const trimmed = line.trim()

    if (!trimmed) {
      out.push({ chords: null, text: '', isSection: false })
      continue
    }

    if (/^\[[^\]]+\]$/.test(trimmed) && !isChordToken(trimmed.slice(1, -1))) {
      out.push({ chords: null, text: trimmed.slice(1, -1), isSection: true })
      continue
    }

    if (isChordOnlyLine(trimmed)) {
      const next = lines[i + 1]
      if (next !== undefined && next.trim() && !isChordOnlyLine(next.trim())) {
        out.push({ chords: trimmed, text: next, isSection: false })
        i += 1
        continue
      }
      out.push({ chords: trimmed, text: '', isSection: false })
      continue
    }

    if (/\[[A-G][#b]?(?:m|maj|min|dim|aug|sus\d?|add\d?|\d+)*\]/.test(line)) {
      const chords = extractBracketChords(line)
      const text = line.replace(/\[[A-G][#b]?(?:m|maj|min|dim|aug|sus\d?|add\d?|\d+)*\]/g, '').replace(/  +/g, ' ')
      out.push({ chords, text, isSection: false })
      continue
    }

    out.push({ chords: null, text: line, isSection: false })
  }

  return out
}

function isChordToken(token: string) {
  return /^[A-G][#b]?(?:m|maj|min|dim|aug|sus\d?|add\d?|\d+)*(?:\/[A-G][#b]?)?$/.test(token)
}

function isChordOnlyLine(line: string) {
  const parts = line.split(/\s+/).filter(Boolean)
  return parts.length > 0 && parts.every(isChordToken)
}

function extractBracketChords(line: string) {
  const matches = [...line.matchAll(/\[([A-G][#b]?(?:m|maj|min|dim|aug|sus\d?|add\d?|\d+)*)\]/g)]
  return matches.map((m) => m[1]).join('  ')
}
