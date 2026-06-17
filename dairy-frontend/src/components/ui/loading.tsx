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
      className={cn('animate-spin text-[#4F46E5]', spinnerSizes[size], className)}
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
        'flex w-full flex-col items-center justify-center gap-3 text-[#6B7280]',
        minHeightClassName,
        className,
      )}
    >
      <div className="rounded-[20px] bg-white p-4 shadow-[0_4px_24px_rgba(0,0,0,0.04)] dark:bg-[#1A1A1A] dark:shadow-[0_4px_24px_rgba(0,0,0,0.3)]">
        <LoadingSpinner size={size} />
      </div>
      <p className="text-[13px] font-medium">{label}</p>
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
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[70] h-[2px] overflow-hidden">
      <div
        className={cn(
          'h-full origin-left rounded-r-full bg-[#4F46E5] shadow-[0_0_12px_rgba(79,70,229,0.4)] transition-all duration-500 ease-out',
          active ? 'scale-x-100 opacity-100' : 'scale-x-0 opacity-0',
        )}
      />
    </div>
  )
}
