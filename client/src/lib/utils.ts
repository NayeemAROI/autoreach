import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type {
  PaginatedResponse, SortState,
  PlanTier, UserStatus, CampaignStatus, CampaignHealth,
  IntegrationHealth, AlertLevel, AuditSeverity, LeadStatus,
  EnrichmentStatus, VerificationStatus, WorkspaceStatus,
  SubscriptionStatus, SentimentLabel,
} from '@/types'

// ─── Class Names ───
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ─── Date Formatting ───
export function formatDate(date: string | Date): string {
  const d = new Date(date)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function formatDateTime(date: string | Date): string {
  const d = new Date(date)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function formatRelativeTime(date: string | Date): string {
  const d = new Date(date)
  const now = new Date()
  const diff = (now.getTime() - d.getTime()) / 1000
  if (diff < 60) return 'Just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 172800) return 'Yesterday'
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
  return formatDate(date)
}

// ─── Number Formatting ───
export function compactNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString()
}

export function formatPercent(value: number, total: number): string {
  if (total === 0) return '0%'
  return `${Math.round((value / total) * 100)}%`
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

// ─── Status → Badge Mapping ───
type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'accent'

export function planBadge(plan: PlanTier): { label: string; variant: BadgeVariant } {
  const map: Record<PlanTier, { label: string; variant: BadgeVariant }> = {
    free: { label: 'Free', variant: 'neutral' },
    pro: { label: 'Pro', variant: 'info' },
    business: { label: 'Business', variant: 'accent' },
    enterprise: { label: 'Enterprise', variant: 'success' },
  }
  return map[plan]
}

export function userStatusBadge(status: UserStatus): { label: string; variant: BadgeVariant } {
  const map: Record<UserStatus, { label: string; variant: BadgeVariant }> = {
    active: { label: 'Active', variant: 'success' },
    suspended: { label: 'Suspended', variant: 'danger' },
    pending: { label: 'Pending', variant: 'warning' },
    deactivated: { label: 'Deactivated', variant: 'neutral' },
  }
  return map[status]
}

export function workspaceStatusBadge(status: WorkspaceStatus): { label: string; variant: BadgeVariant } {
  const map: Record<WorkspaceStatus, { label: string; variant: BadgeVariant }> = {
    active: { label: 'Active', variant: 'success' },
    suspended: { label: 'Suspended', variant: 'danger' },
    disabled: { label: 'Disabled', variant: 'neutral' },
  }
  return map[status]
}

export function campaignStatusBadge(status: CampaignStatus): { label: string; variant: BadgeVariant } {
  const map: Record<CampaignStatus, { label: string; variant: BadgeVariant }> = {
    draft: { label: 'Draft', variant: 'neutral' },
    active: { label: 'Active', variant: 'success' },
    paused: { label: 'Paused', variant: 'warning' },
    completed: { label: 'Completed', variant: 'info' },
    failed: { label: 'Failed', variant: 'danger' },
    archived: { label: 'Archived', variant: 'neutral' },
  }
  return map[status]
}

export function campaignHealthBadge(health: CampaignHealth): { label: string; variant: BadgeVariant } {
  const map: Record<CampaignHealth, { label: string; variant: BadgeVariant }> = {
    healthy: { label: 'Healthy', variant: 'success' },
    warning: { label: 'Warning', variant: 'warning' },
    critical: { label: 'Critical', variant: 'danger' },
    unknown: { label: 'Unknown', variant: 'neutral' },
  }
  return map[health]
}

export function integrationHealthBadge(health: IntegrationHealth): { label: string; variant: BadgeVariant } {
  const map: Record<IntegrationHealth, { label: string; variant: BadgeVariant }> = {
    operational: { label: 'Operational', variant: 'success' },
    degraded: { label: 'Degraded', variant: 'warning' },
    down: { label: 'Down', variant: 'danger' },
    unknown: { label: 'Unknown', variant: 'neutral' },
  }
  return map[health]
}

export function alertLevelBadge(level: AlertLevel): { label: string; variant: BadgeVariant } {
  const map: Record<AlertLevel, { label: string; variant: BadgeVariant }> = {
    info: { label: 'Info', variant: 'info' },
    warning: { label: 'Warning', variant: 'warning' },
    error: { label: 'Error', variant: 'danger' },
    critical: { label: 'Critical', variant: 'danger' },
  }
  return map[level]
}

export function auditSeverityBadge(severity: AuditSeverity): { label: string; variant: BadgeVariant } {
  const map: Record<AuditSeverity, { label: string; variant: BadgeVariant }> = {
    info: { label: 'Info', variant: 'info' },
    warning: { label: 'Warning', variant: 'warning' },
    critical: { label: 'Critical', variant: 'danger' },
  }
  return map[severity]
}

export function leadStatusBadge(status: LeadStatus): { label: string; variant: BadgeVariant } {
  const map: Record<LeadStatus, { label: string; variant: BadgeVariant }> = {
    new: { label: 'New', variant: 'info' },
    enriched: { label: 'Enriched', variant: 'accent' },
    verified: { label: 'Verified', variant: 'success' },
    contacted: { label: 'Contacted', variant: 'info' },
    replied: { label: 'Replied', variant: 'success' },
    converted: { label: 'Converted', variant: 'success' },
    bounced: { label: 'Bounced', variant: 'danger' },
  }
  return map[status]
}

export function enrichmentBadge(status: EnrichmentStatus): { label: string; variant: BadgeVariant } {
  const map: Record<EnrichmentStatus, { label: string; variant: BadgeVariant }> = {
    pending: { label: 'Pending', variant: 'warning' },
    enriched: { label: 'Enriched', variant: 'success' },
    failed: { label: 'Failed', variant: 'danger' },
    not_started: { label: 'Not Started', variant: 'neutral' },
  }
  return map[status]
}

export function verificationBadge(status: VerificationStatus): { label: string; variant: BadgeVariant } {
  const map: Record<VerificationStatus, { label: string; variant: BadgeVariant }> = {
    pending: { label: 'Pending', variant: 'warning' },
    verified: { label: 'Verified', variant: 'success' },
    invalid: { label: 'Invalid', variant: 'danger' },
    unknown: { label: 'Unknown', variant: 'neutral' },
    not_started: { label: 'Not Started', variant: 'neutral' },
  }
  return map[status]
}

export function subscriptionStatusBadge(status: SubscriptionStatus): { label: string; variant: BadgeVariant } {
  const map: Record<SubscriptionStatus, { label: string; variant: BadgeVariant }> = {
    active: { label: 'Active', variant: 'success' },
    trialing: { label: 'Trial', variant: 'info' },
    past_due: { label: 'Past Due', variant: 'danger' },
    canceled: { label: 'Canceled', variant: 'neutral' },
    incomplete: { label: 'Incomplete', variant: 'warning' },
  }
  return map[status]
}

export function sentimentBadge(sentiment: SentimentLabel): { label: string; variant: BadgeVariant } {
  const map: Record<SentimentLabel, { label: string; variant: BadgeVariant }> = {
    positive: { label: 'Positive', variant: 'success' },
    neutral: { label: 'Neutral', variant: 'info' },
    negative: { label: 'Negative', variant: 'danger' },
    not_interested: { label: 'Not Interested', variant: 'neutral' },
    booked: { label: 'Booked', variant: 'success' },
    follow_up: { label: 'Follow Up', variant: 'warning' },
  }
  return map[sentiment]
}

// ─── Usage Warning ───
export function usageWarningLevel(used: number, limit: number): 'ok' | 'warn' | 'critical' | 'exceeded' {
  if (limit === 0) return 'ok'
  const pct = used / limit
  if (pct >= 1) return 'exceeded'
  if (pct >= 0.9) return 'critical'
  if (pct >= 0.75) return 'warn'
  return 'ok'
}

// ─── Generic Table Helpers ───
export function filterBySearch<T>(items: T[], search: string, fields: (keyof T)[]): T[] {
  if (!search.trim()) return items
  const q = search.toLowerCase()
  return items.filter(item =>
    fields.some(field => String(item[field] ?? '').toLowerCase().includes(q))
  )
}

export function sortItems<T>(items: T[], sort: SortState | null): T[] {
  if (!sort) return items
  return [...items].sort((a, b) => {
    const aVal = (a as Record<string, unknown>)[sort.column]
    const bVal = (b as Record<string, unknown>)[sort.column]
    const cmp = String(aVal ?? '').localeCompare(String(bVal ?? ''), undefined, { numeric: true })
    return sort.direction === 'asc' ? cmp : -cmp
  })
}

export function paginateItems<T>(items: T[], page: number, pageSize: number): PaginatedResponse<T> {
  const total = items.length
  const totalPages = Math.ceil(total / pageSize)
  const start = page * pageSize
  return {
    data: items.slice(start, start + pageSize),
    total,
    page,
    pageSize,
    totalPages,
  }
}

export type { BadgeVariant }
