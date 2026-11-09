import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amp/70 disabled:pointer-events-none disabled:opacity-45 active:scale-[0.97] tap-target',
  {
    variants: {
      variant: {
        default:
          'bg-amp text-stage-950 shadow-[0_10px_30px_rgb(255_138_61_/_0.28)] hover:bg-amp-soft',
        secondary:
          'bg-stage-800 text-stage-100 border border-white/10 hover:bg-stage-700',
        ghost: 'bg-transparent text-stage-200 hover:bg-white/5 hover:text-white',
        outline:
          'border border-amp/40 bg-amp/10 text-amp-soft hover:bg-amp/20',
        danger: 'bg-rose-glow/90 text-white hover:bg-rose-glow',
      },
      size: {
        default: 'h-12 px-5',
        sm: 'h-10 px-3 text-xs',
        lg: 'h-14 px-7 text-base',
        icon: 'h-12 w-12',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    )
  },
)
Button.displayName = 'Button'
