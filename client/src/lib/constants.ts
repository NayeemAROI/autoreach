import type { PlanTier } from '@/types'

// ─── Plan Config ───
export const PLAN_TIERS: Record<PlanTier, {
  label: string
  price: number
  leads: number
  members: number
  campaigns: number
  connectedAccounts: number
  dailyInvites: number
  dailyMessages: number
}> = {
  free: { label: 'Free', price: 0, leads: 50, members: 1, campaigns: 1, connectedAccounts: 1, dailyInvites: 10, dailyMessages: 10 },
  pro: { label: 'Pro', price: 49, leads: 2500, members: 3, campaigns: 10, connectedAccounts: 1, dailyInvites: 50, dailyMessages: 100 },
  business: { label: 'Business', price: 149, leads: 25000, members: 10, campaigns: 50, connectedAccounts: 3, dailyInvites: 100, dailyMessages: 200 },
  enterprise: { label: 'Enterprise', price: 499, leads: 100000, members: 50, campaigns: 200, connectedAccounts: 10, dailyInvites: 300, dailyMessages: 500 },
}

// ─── Navigation ───
export const ADMIN_NAV = [
  { label: 'Overview', path: '/admin/overview', icon: 'LayoutDashboard' },
  { label: 'Users', path: '/admin/users', icon: 'Users' },
  { label: 'Workspaces', path: '/admin/workspaces', icon: 'Building2' },
  { label: 'Campaign Monitor', path: '/admin/campaign-monitor', icon: 'Radar' },
  { label: 'Billing', path: '/admin/billing', icon: 'CreditCard' },
  { label: 'Integrations', path: '/admin/integrations', icon: 'Plug' },
  { label: 'System Health', path: '/admin/system-health', icon: 'HeartPulse' },
  { label: 'Audit Logs', path: '/admin/audit-logs', icon: 'ScrollText' },
  { label: 'Settings', path: '/admin/settings', icon: 'Settings' },
] as const

export const OWNER_NAV = [
  { label: 'Dashboard', path: '/owner/dashboard', icon: 'LayoutDashboard' },
  { label: 'Campaigns', path: '/owner/campaigns', icon: 'Rocket' },
  { label: 'Leads', path: '/owner/leads', icon: 'Users' },
  { label: 'Inbox', path: '/owner/inbox', icon: 'Mail' },
  { label: 'Team', path: '/owner/team', icon: 'UsersRound' },
  { label: 'LinkedIn', path: '/owner/linkedin', icon: 'Linkedin' },
  { label: 'Billing', path: '/owner/billing', icon: 'CreditCard' },
  { label: 'Settings', path: '/owner/settings', icon: 'Settings' },
] as const

// ─── Color Tokens ───
export const BADGE_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  success: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', dot: 'bg-emerald-400' },
  warning: { bg: 'bg-amber-500/10', text: 'text-amber-400', dot: 'bg-amber-400' },
  danger: { bg: 'bg-red-500/10', text: 'text-red-400', dot: 'bg-red-400' },
  info: { bg: 'bg-blue-500/10', text: 'text-blue-400', dot: 'bg-blue-400' },
  neutral: { bg: 'bg-zinc-500/10', text: 'text-zinc-400', dot: 'bg-zinc-400' },
  accent: { bg: 'bg-violet-500/10', text: 'text-violet-400', dot: 'bg-violet-400' },
}

export const CHART_COLORS = ['#8b5cf6', '#06b6d4', '#22c55e', '#f59e0b', '#ef4444', '#ec4899']

// ─── Workspace Roles ───
export const PERMISSION_MATRIX = {
  billing_access: { owner: true, admin: false, member: false },
  campaign_creation: { owner: true, admin: true, member: false },
  lead_import: { owner: true, admin: true, member: true },
  inbox_access: { owner: true, admin: true, member: true },
  linkedin_settings: { owner: true, admin: false, member: false },
  team_management: { owner: true, admin: true, member: false },
} as const

export const PERMISSION_LABELS: Record<string, string> = {
  billing_access: 'Billing Access',
  campaign_creation: 'Campaign Creation',
  lead_import: 'Lead Import',
  inbox_access: 'Inbox Access',
  linkedin_settings: 'LinkedIn Settings',
  team_management: 'Team Management',
}
