// ─── Pagination & Table Infrastructure ───
export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface TableFilterState {
  search: string
  filters: Record<string, string | string[]>
  dateRange?: { from: string; to: string }
}

export interface SortState {
  column: string
  direction: 'asc' | 'desc'
}

// ─── Dashboard KPIs ───
export interface DashboardKPI {
  label: string
  value: number | string
  delta?: number
  deltaLabel?: string
  trend?: 'up' | 'down' | 'flat'
  icon?: string
  href?: string
}

export interface ChartSeriesPoint {
  date: string
  value: number
  label?: string
}

// ─── Users ───
export type UserStatus = 'active' | 'suspended' | 'pending' | 'deactivated'
export type GlobalRole = 'superadmin' | 'user'
export type PlanTier = 'free' | 'pro' | 'business' | 'enterprise'

export interface UserRow {
  id: string
  name: string
  email: string
  avatar?: string
  globalRole: GlobalRole
  plan: PlanTier
  workspaceCount: number
  lastActive: string
  status: UserStatus
  createdAt: string
}

export interface LoginHistoryItem {
  id: string
  timestamp: string
  ip: string
  userAgent: string
  location?: string
  success: boolean
}

export interface UserDetails extends UserRow {
  phone?: string
  timezone?: string
  loginHistory: LoginHistoryItem[]
  workspaces: { id: string; name: string; role: WorkspaceRole }[]
  billingEmail?: string
  stripeCustomerId?: string
  totalLeads: number
  totalCampaigns: number
  recentActions: AuditEvent[]
}

// ─── Workspaces ───
export type WorkspaceStatus = 'active' | 'suspended' | 'disabled'
export type WorkspaceRole = 'owner' | 'admin' | 'member'

export interface WorkspaceRow {
  id: string
  name: string
  ownerName: string
  ownerEmail: string
  plan: PlanTier
  memberCount: number
  leadCount: number
  campaignCount: number
  linkedinConnected: boolean
  linkedinAccountName?: string
  lastActive: string
  status: WorkspaceStatus
  createdAt: string
}

export interface WorkspaceMember {
  id: string
  name: string
  email: string
  avatar?: string
  role: WorkspaceRole
  status: 'active' | 'invited' | 'removed'
  joinedAt: string
  lastActive?: string
  campaignsOwned: number
}

export interface WorkspaceDetails extends WorkspaceRow {
  members: WorkspaceMember[]
  monthlyInvites: number
  monthlyMessages: number
  subscriptionStatus: string
  billingCycle?: string
}

// ─── Campaigns ───
export type CampaignStatus = 'draft' | 'active' | 'paused' | 'completed' | 'failed' | 'archived'
export type CampaignHealth = 'healthy' | 'warning' | 'critical' | 'unknown'

export interface CampaignMonitorRow {
  id: string
  name: string
  workspaceName: string
  workspaceId: string
  status: CampaignStatus
  leadsInQueue: number
  sentToday: number
  replied: number
  failed: number
  nextRun?: string
  health: CampaignHealth
  senderAccount?: string
  createdAt: string
}

export interface CampaignSummary {
  id: string
  name: string
  status: CampaignStatus
  senderAccount: string
  leadsInFlow: number
  invitesSent: number
  accepted: number
  replied: number
  nextAction?: string
  health: CampaignHealth
  createdAt: string
  createdBy: string
}

export interface SequenceStep {
  id: string
  type: 'start' | 'invite' | 'wait' | 'message' | 'follow_up' | 'condition' | 'end'
  label: string
  config: Record<string, unknown>
  order: number
  stats?: { sent: number; delivered: number; replied: number; failed: number }
}

export interface CampaignDetail extends CampaignSummary {
  description?: string
  sequence: SequenceStep[]
  dailyInviteLimit: number
  dailyMessageLimit: number
  activeDays: string[]
  activeHoursStart: string
  activeHoursEnd: string
  stopOnReply: boolean
  totalLeads: number
  completedLeads: number
  errors: { message: string; timestamp: string }[]
}

export interface CampaignLeadRow {
  id: string
  leadId: string
  leadName: string
  company: string
  currentStep: string
  status: 'queued' | 'in_progress' | 'completed' | 'failed' | 'replied' | 'skipped'
  lastAction?: string
  lastActionAt?: string
  nextAction?: string
  replyStatus?: 'none' | 'positive' | 'neutral' | 'negative'
}

// ─── Leads ───
export type LeadStatus = 'new' | 'enriched' | 'verified' | 'contacted' | 'replied' | 'converted' | 'bounced'
export type EnrichmentStatus = 'pending' | 'enriched' | 'failed' | 'not_started'
export type VerificationStatus = 'pending' | 'verified' | 'invalid' | 'unknown' | 'not_started'

export interface LeadRow {
  id: string
  firstName: string
  lastName: string
  title?: string
  company?: string
  linkedinUrl?: string
  email?: string
  avatar?: string
  enrichmentStatus: EnrichmentStatus
  verificationStatus: VerificationStatus
  status: LeadStatus
  assignedCampaign?: string
  assignedCampaignId?: string
  source: 'csv' | 'manual' | 'linkedin' | 'api'
  lastActivity?: string
  createdAt: string
}

export interface CompanySummary {
  name: string
  industry?: string
  size?: string
  location?: string
  website?: string
  linkedinUrl?: string
}

export interface LeadDetails extends LeadRow {
  about?: string
  location?: string
  connections?: number
  company_details?: CompanySummary
  campaignHistory: { campaignName: string; status: string; enrolledAt: string }[]
  inboxHistory: { preview: string; sentAt: string; direction: 'in' | 'out' }[]
  notes: { text: string; createdAt: string; createdBy: string }[]
}

// ─── Team ───
export interface TeamMemberRow {
  id: string
  name: string
  email: string
  avatar?: string
  role: WorkspaceRole
  status: 'active' | 'invited' | 'removed'
  campaignsOwned: number
  lastActive?: string
  joinedAt: string
}

// ─── Inbox ───
export type SentimentLabel = 'positive' | 'neutral' | 'negative' | 'not_interested' | 'booked' | 'follow_up'

export interface InboxThreadSummary {
  id: string
  leadName: string
  leadTitle?: string
  leadCompany?: string
  leadAvatar?: string
  lastMessage: string
  lastMessageAt: string
  unread: boolean
  campaignName?: string
  sentiment?: SentimentLabel
  assignedTo?: string
  messageCount: number
}

export interface InboxMessage {
  id: string
  threadId: string
  direction: 'in' | 'out'
  content: string
  sentAt: string
  senderName: string
  read: boolean
}

export interface InboxThread {
  id: string
  lead: LeadRow
  messages: InboxMessage[]
  sentiment?: SentimentLabel
  campaignName?: string
  assignedTo?: string
}

// ─── Billing ───
export type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'canceled' | 'incomplete'

export interface SubscriptionRow {
  id: string
  workspaceName: string
  workspaceId: string
  ownerName: string
  ownerEmail: string
  plan: PlanTier
  status: SubscriptionStatus
  renewalDate: string
  leadUsage: { used: number; limit: number }
  memberUsage: { used: number; limit: number }
  connectedAccountUsage: { used: number; limit: number }
  mrr: number
}

export interface PlanUsage {
  leads: { used: number; limit: number }
  members: { used: number; limit: number }
  campaigns: { used: number; limit: number }
  connectedAccounts: { used: number; limit: number }
  dailyInvites: { used: number; limit: number }
  dailyMessages: { used: number; limit: number }
}

export interface BillingHistoryItem {
  id: string
  date: string
  description: string
  amount: number
  status: 'paid' | 'pending' | 'failed' | 'refunded'
  invoiceUrl?: string
}

// ─── Audit ───
export type AuditSeverity = 'info' | 'warning' | 'critical'

export interface AuditEvent {
  id: string
  timestamp: string
  actor: string
  actorEmail: string
  actorId: string
  action: string
  target?: string
  targetId?: string
  workspaceName?: string
  workspaceId?: string
  ip?: string
  severity: AuditSeverity
  details?: Record<string, unknown>
  metadata?: { endpoint?: string; method?: string; before?: unknown; after?: unknown }
}

// ─── Alerts ───
export type AlertLevel = 'info' | 'warning' | 'error' | 'critical'

export interface AlertItem {
  id: string
  level: AlertLevel
  title: string
  message: string
  timestamp: string
  source: string
  dismissed: boolean
  actionLabel?: string
  actionHref?: string
}

export interface OwnerAlert {
  id: string
  level: AlertLevel
  title: string
  message: string
  timestamp: string
  type: 'campaign' | 'linkedin' | 'billing' | 'team' | 'enrichment' | 'verification'
}

// ─── Integrations ───
export type IntegrationHealth = 'operational' | 'degraded' | 'down' | 'unknown'

export interface IntegrationStatus {
  name: string
  slug: string
  health: IntegrationHealth
  lastEventAt?: string
  failureCount: number
  description: string
  configuredAt?: string
  details?: Record<string, unknown>
}

export interface LinkedInHealthStatus {
  connected: boolean
  accountName?: string
  accountId?: string
  sessionHealth: 'healthy' | 'stale' | 'expired' | 'unknown'
  lastSyncAt?: string
  inviteUsage: { used: number; limit: number }
  messageUsage: { used: number; limit: number }
  inboxSyncHealth: IntegrationHealth
  webhookHealth: IntegrationHealth
  recentEvents: { type: string; message: string; timestamp: string }[]
}

// ─── Stats ───
export interface SuperAdminStats {
  totalUsers: number
  activeWorkspaces: number
  liveCampaigns: number
  messagesSentToday: number
  invitesSentToday: number
  activePaidAccounts: number
  mrr: number
  userGrowth: ChartSeriesPoint[]
  workspaceGrowth: ChartSeriesPoint[]
  invitesVsMessages: { date: string; invites: number; messages: number }[]
  planDistribution: { plan: string; count: number }[]
}

export interface OwnerStats {
  totalLeads: number
  activeCampaigns: number
  invitesSentToday: number
  messagesSentToday: number
  acceptedConnections: number
  replies: number
  enrichmentPending: number
  verificationPending: number
  campaignFunnel: { step: string; count: number }[]
  dailyActivity: { date: string; invites: number; messages: number; replies: number }[]
}
