import type { SubscriptionRow, BillingHistoryItem } from '@/types'

export const mockSubscriptions: SubscriptionRow[] = [
  { id: 'sub-001', workspaceName: 'Autoreach Main', workspaceId: 'ws-001', ownerName: 'Nayeemur Rahman', ownerEmail: 'nayeem@autoreach.io', plan: 'business', status: 'active', renewalDate: '2026-04-15T00:00:00Z', leadUsage: { used: 2480, limit: 25000 }, memberUsage: { used: 5, limit: 10 }, connectedAccountUsage: { used: 1, limit: 3 }, mrr: 149 },
  { id: 'sub-002', workspaceName: 'TechFlow Sales', workspaceId: 'ws-002', ownerName: 'Sarah Mitchell', ownerEmail: 'sarah@techflow.co', plan: 'pro', status: 'active', renewalDate: '2026-04-03T00:00:00Z', leadUsage: { used: 890, limit: 2500 }, memberUsage: { used: 3, limit: 3 }, connectedAccountUsage: { used: 1, limit: 1 }, mrr: 49 },
  { id: 'sub-003', workspaceName: 'Outbound Dev Team', workspaceId: 'ws-003', ownerName: 'James Chen', ownerEmail: 'james.chen@outbound.dev', plan: 'business', status: 'active', renewalDate: '2026-04-22T00:00:00Z', leadUsage: { used: 5200, limit: 25000 }, memberUsage: { used: 7, limit: 10 }, connectedAccountUsage: { used: 2, limit: 3 }, mrr: 149 },
  { id: 'sub-004', workspaceName: 'SalesGrid HQ', workspaceId: 'ws-004', ownerName: 'Emily Rodriguez', ownerEmail: 'emily@salesgrid.com', plan: 'free', status: 'active', renewalDate: '', leadUsage: { used: 42, limit: 50 }, memberUsage: { used: 1, limit: 1 }, connectedAccountUsage: { used: 0, limit: 1 }, mrr: 0 },
  { id: 'sub-005', workspaceName: 'Connect AI Ops', workspaceId: 'ws-005', ownerName: 'Michael Brooks', ownerEmail: 'mbrooks@connect.ai', plan: 'pro', status: 'past_due', renewalDate: '2026-03-20T00:00:00Z', leadUsage: { used: 310, limit: 2500 }, memberUsage: { used: 2, limit: 3 }, connectedAccountUsage: { used: 1, limit: 1 }, mrr: 49 },
  { id: 'sub-006', workspaceName: 'GrowthLab Agency', workspaceId: 'ws-006', ownerName: 'Aisha Patel', ownerEmail: 'aisha@growthlab.io', plan: 'business', status: 'active', renewalDate: '2026-04-18T00:00:00Z', leadUsage: { used: 7800, limit: 25000 }, memberUsage: { used: 8, limit: 10 }, connectedAccountUsage: { used: 2, limit: 3 }, mrr: 149 },
  { id: 'sub-007', workspaceName: 'ReachScale Enterprise', workspaceId: 'ws-007', ownerName: 'Tom Nakamura', ownerEmail: 'tom@reachscale.com', plan: 'enterprise', status: 'active', renewalDate: '2026-04-05T00:00:00Z', leadUsage: { used: 24500, limit: 100000 }, memberUsage: { used: 18, limit: 50 }, connectedAccountUsage: { used: 4, limit: 10 }, mrr: 499 },
  { id: 'sub-008', workspaceName: 'LeadForge Team', workspaceId: 'ws-010', ownerName: 'Priya Sharma', ownerEmail: 'priya@leadforge.io', plan: 'pro', status: 'trialing', renewalDate: '2026-04-01T00:00:00Z', leadUsage: { used: 120, limit: 2500 }, memberUsage: { used: 1, limit: 3 }, connectedAccountUsage: { used: 1, limit: 1 }, mrr: 0 },
]

export const mockBillingHistory: BillingHistoryItem[] = [
  { id: 'inv-001', date: '2026-03-15T00:00:00Z', description: 'Business Plan — Monthly', amount: 149, status: 'paid', invoiceUrl: '#' },
  { id: 'inv-002', date: '2026-02-15T00:00:00Z', description: 'Business Plan — Monthly', amount: 149, status: 'paid', invoiceUrl: '#' },
  { id: 'inv-003', date: '2026-01-15T00:00:00Z', description: 'Business Plan — Monthly', amount: 149, status: 'paid', invoiceUrl: '#' },
  { id: 'inv-004', date: '2025-12-15T00:00:00Z', description: 'Pro Plan — Monthly (Upgraded Mid-Cycle)', amount: 49, status: 'paid', invoiceUrl: '#' },
  { id: 'inv-005', date: '2025-11-15T00:00:00Z', description: 'Pro Plan — Monthly', amount: 49, status: 'paid', invoiceUrl: '#' },
  { id: 'inv-006', date: '2025-10-15T00:00:00Z', description: 'Pro Plan — Monthly', amount: 49, status: 'refunded', invoiceUrl: '#' },
]
