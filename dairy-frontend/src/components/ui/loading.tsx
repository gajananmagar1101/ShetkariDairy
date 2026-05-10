import { Loader2 } from 'lucide-react'
import { cn } from '../../lib/utils'

type SpinnerSize = 'sm' | 'md' | 'lg'

const spinnerSizes: Record<SpinnerSize, string> = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-10 w-10',
}

interface LoadingSpinnerProps {
  size?: SpinnerSize
  className?: string
}

export function LoadingSpinner({ size = 'md', className }: LoadingSpinnerProps) {
  return (
    <Loader2
      className={cn('animate-spin text-primary-500', spinnerSizes[size], className)}
    />
  )
}

interface LoadingBlockProps {
  label?: string
  minHeightClassName?: string
  className?: string
  size?: SpinnerSize
}

export function LoadingBlock({
  label = 'Loading...',
  minHeightClassName = 'min-h-[240px]',
  className,
  size = 'lg',
}: LoadingBlockProps) {
  return (
    <div
      className={cn(
        'flex w-full flex-col items-center justify-center gap-3 text-slate-500 dark:text-slate-300',
        minHeightClassName,
        className,
      )}
    >
      <div className="rounded-full border border-white/70 bg-white/80 p-4 shadow-[0_10px_30px_rgba(15,23,42,0.08)] backdrop-blur-md dark:border-slate-700/70 dark:bg-slate-900/70">
        <LoadingSpinner size={size} />
      </div>
      <p className="text-sm font-semibold tracking-wide">{label}</p>
    </div>
  )
}

interface LoadingInlineProps {
  label?: string
  className?: string
}

export function LoadingInline({
  label = 'Loading...',
  className,
}: LoadingInlineProps) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <LoadingSpinner size="sm" className="text-current" />
      {label ? <span>{label}</span> : null}
    </span>
  )
}

export function GlobalLoadBar({ active }: { active: boolean }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[70] h-1 overflow-hidden">
      <div
        className={cn(
          'h-full origin-left rounded-r-full bg-gradient-to-r from-sky-400 via-primary-500 to-emerald-400 shadow-[0_0_24px_rgba(59,130,246,0.45)] transition-all duration-300 ease-out',
          active ? 'scale-x-100 opacity-100' : 'scale-x-0 opacity-0',
        )}
      />
    </div>
  )
}
