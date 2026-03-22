import { Search } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function SearchInput({ value, onChange, placeholder = 'Search...', className }: SearchInputProps) {
  return (
    <div className={cn('relative', className)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-900/80 border border-zinc-800 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors"
      />
    </div>
  )
}

interface FilterBarProps {
  filters: { label: string; value: string; options: { label: string; value: string }[] }[]
  activeFilters: Record<string, string>
  onFilterChange: (key: string, value: string) => void
  className?: string
}

export function FilterBar({ filters, activeFilters, onFilterChange, className }: FilterBarProps) {
  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {filters.map((filter) => (
        <select
          key={filter.value}
          value={activeFilters[filter.value] || ''}
          onChange={(e) => onFilterChange(filter.value, e.target.value)}
          className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 focus:outline-none focus:border-zinc-600 transition-colors cursor-pointer"
        >
          <option value="">{filter.label}</option>
          {filter.options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      ))}
    </div>
  )
}

interface TableToolbarProps {
  search: string
  onSearchChange: (value: string) => void
  searchPlaceholder?: string
  children?: React.ReactNode
  className?: string
}

export function TableToolbar({ search, onSearchChange, searchPlaceholder, children, className }: TableToolbarProps) {
  return (
    <div className={cn('flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between', className)}>
      <SearchInput value={search} onChange={onSearchChange} placeholder={searchPlaceholder} className="w-full sm:w-80" />
      {children && <div className="flex items-center gap-2 flex-wrap">{children}</div>}
    </div>
  )
}
