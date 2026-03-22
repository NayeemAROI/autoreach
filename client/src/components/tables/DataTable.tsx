import { useState, ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'

// ─── DataTable ───
interface Column<T> {
  key: string
  header: string
  render: (row: T) => ReactNode
  sortable?: boolean
  className?: string
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  keyExtractor: (row: T) => string
  onRowClick?: (row: T) => void
  emptyState?: ReactNode
  loading?: boolean
  className?: string
}

export function DataTable<T>({ columns, data, keyExtractor, onRowClick, emptyState, loading, className }: DataTableProps<T>) {
  if (loading) {
    return (
      <div className="space-y-3 p-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 animate-pulse">
            <div className="w-8 h-8 rounded-full bg-zinc-800" />
            <div className="flex-1 h-3 bg-zinc-800 rounded-full" />
            <div className="w-20 h-3 bg-zinc-800/60 rounded-full" />
            <div className="w-16 h-6 bg-zinc-800 rounded-full" />
          </div>
        ))}
      </div>
    )
  }

  if (data.length === 0 && emptyState) {
    return <>{emptyState}</>
  }

  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="w-full">
        <thead>
          <tr className="border-b border-zinc-800/60">
            {columns.map((col) => (
              <th key={col.key} className={cn('text-left px-5 py-3 text-[11px] uppercase tracking-wider text-zinc-500 font-semibold', col.className)}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr
              key={keyExtractor(row)}
              onClick={() => onRowClick?.(row)}
              className={cn(
                'border-b border-zinc-800/30 transition-colors',
                onRowClick && 'cursor-pointer hover:bg-zinc-900/50'
              )}
            >
              {columns.map((col) => (
                <td key={col.key} className={cn('px-5 py-4', col.className)}>
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── TablePagination ───
interface TablePaginationProps {
  page: number
  totalPages: number
  total: number
  pageSize: number
  onPageChange: (page: number) => void
}

export function TablePagination({ page, totalPages, total, pageSize, onPageChange }: TablePaginationProps) {
  return (
    <div className="flex items-center justify-between px-5 py-3 border-t border-zinc-800/40">
      <p className="text-xs text-zinc-500">
        Showing {page * pageSize + 1}–{Math.min((page + 1) * pageSize, total)} of {total}
      </p>
      <div className="flex gap-1">
        <button
          onClick={() => onPageChange(Math.max(0, page - 1))}
          disabled={page === 0}
          className="px-3 py-1.5 rounded-lg text-xs text-zinc-400 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 disabled:opacity-30 transition"
        >
          Prev
        </button>
        <button
          onClick={() => onPageChange(Math.min(totalPages - 1, page + 1))}
          disabled={page >= totalPages - 1}
          className="px-3 py-1.5 rounded-lg text-xs text-zinc-400 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 disabled:opacity-30 transition"
        >
          Next
        </button>
      </div>
    </div>
  )
}

// ─── RowActionMenu ───
interface RowAction {
  label: string
  icon?: ReactNode
  onClick: () => void
  variant?: 'default' | 'danger'
  disabled?: boolean
}

interface RowActionMenuProps {
  actions: RowAction[]
  className?: string
}

export function RowActionMenu({ actions, className }: RowActionMenuProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className={cn('relative', className)}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open) }}
        className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16"><circle cx="8" cy="3" r="1.5"/><circle cx="8" cy="8" r="1.5"/><circle cx="8" cy="13" r="1.5"/></svg>
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.1 }}
              className="absolute right-0 top-full mt-1 z-50 min-w-[180px] bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl py-1 overflow-hidden"
            >
              {actions.map((action) => (
                <button
                  key={action.label}
                  onClick={(e) => { e.stopPropagation(); action.onClick(); setOpen(false) }}
                  disabled={action.disabled}
                  className={cn(
                    'w-full text-left px-4 py-2.5 text-sm flex items-center gap-2.5 transition-colors disabled:opacity-40',
                    action.variant === 'danger'
                      ? 'text-red-400 hover:bg-red-500/10'
                      : 'text-zinc-300 hover:bg-zinc-800'
                  )}
                >
                  {action.icon}
                  {action.label}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── DetailsDrawer ───
interface DetailsDrawerProps {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  width?: string
  children: ReactNode
}

export function DetailsDrawer({ open, onClose, title, subtitle, width = 'max-w-lg', children }: DetailsDrawerProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className={cn('fixed right-0 top-0 bottom-0 z-50 bg-zinc-950 border-l border-zinc-800/60 flex flex-col w-full', width)}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/60 shrink-0">
              <div>
                <h2 className="text-lg font-bold text-white">{title}</h2>
                {subtitle && <p className="text-xs text-zinc-500 mt-0.5">{subtitle}</p>}
              </div>
              <button onClick={onClose} className="p-2 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export type { Column, RowAction }
