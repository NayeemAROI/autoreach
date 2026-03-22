import type { WorkspaceRow, WorkspaceDetails, WorkspaceMember } from '@/types'

export const mockWorkspaces: WorkspaceRow[] = [
  { id: 'ws-001', name: 'Autoreach Main', ownerName: 'Nayeemur Rahman', ownerEmail: 'nayeem@autoreach.io', plan: 'business', memberCount: 5, leadCount: 2480, campaignCount: 8, linkedinConnected: true, linkedinAccountName: 'Nayeemur Rahman', lastActive: '2026-03-22T05:30:00Z', status: 'active', createdAt: '2025-08-15T10:00:00Z' },
  { id: 'ws-002', name: 'TechFlow Sales', ownerName: 'Sarah Mitchell', ownerEmail: 'sarah@techflow.co', plan: 'pro', memberCount: 3, leadCount: 890, campaignCount: 4, linkedinConnected: true, linkedinAccountName: 'Sarah Mitchell', lastActive: '2026-03-21T18:45:00Z', status: 'active', createdAt: '2025-11-03T14:20:00Z' },
  { id: 'ws-003', name: 'Outbound Dev Team', ownerName: 'James Chen', ownerEmail: 'james.chen@outbound.dev', plan: 'business', memberCount: 7, leadCount: 5200, campaignCount: 12, linkedinConnected: true, linkedinAccountName: 'James Chen', lastActive: '2026-03-22T04:10:00Z', status: 'active', createdAt: '2025-09-22T08:15:00Z' },
  { id: 'ws-004', name: 'SalesGrid HQ', ownerName: 'Emily Rodriguez', ownerEmail: 'emily@salesgrid.com', plan: 'free', memberCount: 1, leadCount: 42, campaignCount: 1, linkedinConnected: false, lastActive: '2026-03-19T12:00:00Z', status: 'active', createdAt: '2026-01-10T16:30:00Z' },
  { id: 'ws-005', name: 'Connect AI Ops', ownerName: 'Michael Brooks', ownerEmail: 'mbrooks@connect.ai', plan: 'pro', memberCount: 2, leadCount: 310, campaignCount: 3, linkedinConnected: true, linkedinAccountName: 'Michael Brooks', lastActive: '2026-03-20T09:00:00Z', status: 'suspended', createdAt: '2025-12-01T11:00:00Z' },
  { id: 'ws-006', name: 'GrowthLab Agency', ownerName: 'Aisha Patel', ownerEmail: 'aisha@growthlab.io', plan: 'business', memberCount: 8, leadCount: 7800, campaignCount: 22, linkedinConnected: true, linkedinAccountName: 'Aisha Patel', lastActive: '2026-03-22T03:25:00Z', status: 'active', createdAt: '2025-10-18T09:45:00Z' },
  { id: 'ws-007', name: 'ReachScale Enterprise', ownerName: 'Tom Nakamura', ownerEmail: 'tom@reachscale.com', plan: 'enterprise', memberCount: 18, leadCount: 24500, campaignCount: 45, linkedinConnected: true, linkedinAccountName: 'Tom Nakamura', lastActive: '2026-03-22T05:50:00Z', status: 'active', createdAt: '2025-07-05T07:30:00Z' },
  { id: 'ws-008', name: 'DemandIO Team', ownerName: 'Rachel Foster', ownerEmail: 'rachel@demandio.co', plan: 'business', memberCount: 4, leadCount: 3100, campaignCount: 9, linkedinConnected: true, linkedinAccountName: 'Rachel Foster', lastActive: '2026-03-22T04:55:00Z', status: 'active', createdAt: '2025-09-10T12:00:00Z' },
]

const mockMembers: WorkspaceMember[] = [
  { id: 'u-001', name: 'Nayeemur Rahman', email: 'nayeem@autoreach.io', role: 'owner', status: 'active', joinedAt: '2025-08-15T10:00:00Z', lastActive: '2026-03-22T05:30:00Z', campaignsOwned: 5 },
  { id: 'u-m01', name: 'Karim Ahmed', email: 'karim@autoreach.io', role: 'admin', status: 'active', joinedAt: '2025-09-01T08:00:00Z', lastActive: '2026-03-22T03:15:00Z', campaignsOwned: 2 },
  { id: 'u-m02', name: 'Fatima Ali', email: 'fatima@autoreach.io', role: 'member', status: 'active', joinedAt: '2025-10-12T14:00:00Z', lastActive: '2026-03-21T18:00:00Z', campaignsOwned: 1 },
  { id: 'u-m03', name: 'Alex Rivera', email: 'alex@autoreach.io', role: 'member', status: 'active', joinedAt: '2026-01-05T09:30:00Z', lastActive: '2026-03-22T04:45:00Z', campaignsOwned: 0 },
  { id: 'u-m04', name: 'Nina Thompson', email: 'nina@autoreach.io', role: 'member', status: 'invited', joinedAt: '2026-03-20T11:00:00Z', campaignsOwned: 0 },
]

export const mockWorkspaceDetails: WorkspaceDetails = {
  ...mockWorkspaces[0],
  members: mockMembers,
  monthlyInvites: 1240,
  monthlyMessages: 3800,
  subscriptionStatus: 'active',
  billingCycle: 'monthly',
}
