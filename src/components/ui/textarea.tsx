import * as React from 'react'
import { cn } from '@/lib/utils'

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<'textarea'>>(
  ({ className, ...props }, ref) => (
    <textarea
      className={cn(
        'flex min-h-28 w-full rounded-xl border border-white/10 bg-stage-900/80 px-4 py-3 text-base text-stage-100 shadow-inner placeholder:text-stage-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amp/60 disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      ref={ref}
      {...props}
    />
  ),
)
Textarea.displayName = 'Textarea'
