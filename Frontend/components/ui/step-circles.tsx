import * as React from 'react'
import { cn } from '@/lib/utils'

interface StepCirclesProps {
  statuses: boolean[]
  size?: 'sm' | 'md' | 'lg'
  className?: string
  ariaLabel?: string
}

export function StepCircles({ statuses, size = 'sm', className, ariaLabel }: StepCirclesProps) {
  const sizeClasses = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-6 w-6',
  } as const

  return (
    <div className={cn('flex items-center gap-2', className)} aria-label={ariaLabel || 'steps'}>
      {statuses.map((done, idx) => (
        <span
          key={idx}
          className={cn(
            'rounded-full inline-block border-2',
            sizeClasses[size],
            done
              ? 'bg-emerald-500 border-emerald-600 shadow-soft'
              : 'bg-transparent border-slate-400 dark:border-slate-500'
          )}
        >
          <span className="sr-only">Step {idx + 1}: {done ? 'completed' : 'pending'}</span>
        </span>
      ))}
    </div>
  )
}
