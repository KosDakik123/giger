const notes = [
  { left: '8%', delay: '0s', size: 18 },
  { left: '22%', delay: '1.2s', size: 14 },
  { left: '48%', delay: '0.6s', size: 20 },
  { left: '70%', delay: '1.8s', size: 16 },
  { left: '86%', delay: '0.3s', size: 22 },
]

export function FloatingNotes({ className = '' }: { className?: string }) {
  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} aria-hidden>
      {notes.map((n, i) => (
        <svg
          key={i}
          className="absolute top-[18%] animate-float-note text-amp/50"
          style={{ left: n.left, animationDelay: n.delay, width: n.size, height: n.size }}
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M9 18V6l10-2v12a3 3 0 1 1-2-2.83V7.2L11 8.5V18a3 3 0 1 1-2-2.83z" />
        </svg>
      ))}
    </div>
  )
}
