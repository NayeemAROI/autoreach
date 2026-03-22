import { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { InboxIcon } from 'lucide-react'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn('flex flex-col items-center justify-center py-16 px-4 text-center', className)}
    >
      <div className="w-14 h-14 rounded-2xl bg-zinc-800/60 flex items-center justify-center mb-4 text-zinc-500">
        {icon || <InboxIcon className="w-7 h-7" />}
      </div>
      <h3 className="text-base font-semibold text-zinc-300 mb-1">{title}</h3>
      {description && <p className="text-sm text-zinc-500 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </motion.div>
  )
}

interface LoadingSkeletonProps {
  rows?: number
  className?: string
}

export function LoadingSkeleton({ rows = 5, className }: LoadingSkeletonProps) {
  return (
    <div className={cn('space-y-3 p-4', className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 animate-pulse">
          <div className="w-9 h-9 rounded-full bg-zinc-800" />
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-zinc-800 rounded-full w-1/3" />
            <div className="h-2.5 bg-zinc-800/60 rounded-full w-1/2" />
          </div>
          <div className="h-6 w-16 bg-zinc-800 rounded-full" />
        </div>
      ))}
    </div>
  )
}

interface ConfirmDialogProps {
  open: boolean
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'default'
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({ open, title, description, confirmLabel = 'Confirm', cancelLabel = 'Cancel', variant = 'default', onConfirm, onCancel }: ConfirmDialogProps) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onCancel}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-md shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold text-white mb-1">{title}</h3>
        <p className="text-sm text-zinc-400 mb-5">{description}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 px-4 py-2.5 rounded-xl bg-zinc-800 border border-zinc-700 text-sm font-medium text-zinc-300 hover:bg-zinc-700 transition-colors">
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={cn(
              'flex-1 px-4 py-2.5 rounded-xl text-sm font-bold transition-colors',
              variant === 'danger' ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-violet-600 hover:bg-violet-700 text-white'
            )}
          >
            {confirmLabel}
          </button>
        </div>
      </motion.div>
    </div>
  )
}
