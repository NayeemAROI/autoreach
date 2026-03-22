import type { UserRow, UserDetails, LoginHistoryItem, AuditEvent } from '@/types'

export const mockUsers: UserRow[] = [
  { id: 'u-001', name: 'Nayeemur Rahman', email: 'nayeem@autoreach.io', globalRole: 'superadmin', plan: 'business', workspaceCount: 3, lastActive: '2026-03-22T05:30:00Z', status: 'active', createdAt: '2025-08-15T10:00:00Z' },
  { id: 'u-002', name: 'Sarah Mitchell', email: 'sarah@techflow.co', globalRole: 'user', plan: 'pro', workspaceCount: 1, lastActive: '2026-03-21T18:45:00Z', status: 'active', createdAt: '2025-11-03T14:20:00Z' },
  { id: 'u-003', name: 'James Chen', email: 'james.chen@outbound.dev', globalRole: 'user', plan: 'business', workspaceCount: 2, lastActive: '2026-03-22T04:10:00Z', status: 'active', createdAt: '2025-09-22T08:15:00Z' },
  { id: 'u-004', name: 'Emily Rodriguez', email: 'emily@salesgrid.com', globalRole: 'user', plan: 'free', workspaceCount: 1, lastActive: '2026-03-19T12:00:00Z', status: 'active', createdAt: '2026-01-10T16:30:00Z' },
  { id: 'u-005', name: 'Michael Brooks', email: 'mbrooks@connect.ai', globalRole: 'user', plan: 'pro', workspaceCount: 1, lastActive: '2026-03-20T09:00:00Z', status: 'suspended', createdAt: '2025-12-01T11:00:00Z' },
  { id: 'u-006', name: 'Aisha Patel', email: 'aisha@growthlab.io', globalRole: 'user', plan: 'business', workspaceCount: 2, lastActive: '2026-03-22T03:25:00Z', status: 'active', createdAt: '2025-10-18T09:45:00Z' },
  { id: 'u-007', name: 'David Kim', email: 'david@pipelinex.co', globalRole: 'user', plan: 'free', workspaceCount: 1, lastActive: '2026-03-15T14:30:00Z', status: 'pending', createdAt: '2026-03-14T20:00:00Z' },
  { id: 'u-008', name: 'Laura Jensen', email: 'laura@closedeal.net', globalRole: 'user', plan: 'pro', workspaceCount: 1, lastActive: '2026-03-22T01:10:00Z', status: 'active', createdAt: '2025-11-28T13:15:00Z' },
  { id: 'u-009', name: 'Tom Nakamura', email: 'tom@reachscale.com', globalRole: 'user', plan: 'enterprise', workspaceCount: 4, lastActive: '2026-03-22T05:50:00Z', status: 'active', createdAt: '2025-07-05T07:30:00Z' },
  { id: 'u-010', name: 'Priya Sharma', email: 'priya@leadforge.io', globalRole: 'user', plan: 'pro', workspaceCount: 1, lastActive: '2026-03-21T22:00:00Z', status: 'active', createdAt: '2026-02-01T10:00:00Z' },
  { id: 'u-011', name: 'Marcus Williams', email: 'marcus@b2bpush.com', globalRole: 'user', plan: 'free', workspaceCount: 1, lastActive: '2026-03-10T08:00:00Z', status: 'deactivated', createdAt: '2025-12-20T15:00:00Z' },
  { id: 'u-012', name: 'Rachel Foster', email: 'rachel@demandio.co', globalRole: 'user', plan: 'business', workspaceCount: 2, lastActive: '2026-03-22T04:55:00Z', status: 'active', createdAt: '2025-09-10T12:00:00Z' },
]

const mockLoginHistory: LoginHistoryItem[] = [
  { id: 'lh-1', timestamp: '2026-03-22T05:30:00Z', ip: '103.45.67.89', userAgent: 'Chrome 120 / Windows 11', location: 'Dhaka, BD', success: true },
  { id: 'lh-2', timestamp: '2026-03-21T14:10:00Z', ip: '103.45.67.89', userAgent: 'Chrome 120 / Windows 11', location: 'Dhaka, BD', success: true },
  { id: 'lh-3', timestamp: '2026-03-20T09:45:00Z', ip: '192.168.1.10', userAgent: 'Firefox 121 / macOS', location: 'Unknown', success: false },
  { id: 'lh-4', timestamp: '2026-03-19T18:30:00Z', ip: '103.45.67.89', userAgent: 'Chrome 120 / Windows 11', location: 'Dhaka, BD', success: true },
]

const mockRecentActions: AuditEvent[] = [
  { id: 'ae-1', timestamp: '2026-03-22T05:28:00Z', actor: 'Nayeemur Rahman', actorEmail: 'nayeem@autoreach.io', actorId: 'u-001', action: 'campaign.started', target: 'Q1 Outreach Campaign', severity: 'info' },
  { id: 'ae-2', timestamp: '2026-03-22T04:50:00Z', actor: 'Nayeemur Rahman', actorEmail: 'nayeem@autoreach.io', actorId: 'u-001', action: 'lead.bulk_import', target: '150 leads imported', severity: 'info', details: { count: 150 } },
]

export const mockUserDetails: UserDetails = {
  ...mockUsers[0],
  phone: '+880 1700-000000',
  timezone: 'Asia/Dhaka',
  loginHistory: mockLoginHistory,
  workspaces: [
    { id: 'ws-001', name: 'Autoreach Main', role: 'owner' },
    { id: 'ws-002', name: 'Client Outreach', role: 'owner' },
    { id: 'ws-003', name: 'Partner Network', role: 'admin' },
  ],
  billingEmail: 'billing@autoreach.io',
  stripeCustomerId: 'cus_Q1xR2y3Z4a5B',
  totalLeads: 4250,
  totalCampaigns: 18,
  recentActions: mockRecentActions,
}
