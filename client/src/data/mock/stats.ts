import type { SuperAdminStats, OwnerStats } from '@/types'

export const mockAdminStats: SuperAdminStats = {
  totalUsers: 142,
  activeWorkspaces: 89,
  liveCampaigns: 34,
  messagesSentToday: 1240,
  invitesSentToday: 680,
  activePaidAccounts: 67,
  mrr: 8450,
  userGrowth: [
    { date: '2025-10', value: 45 }, { date: '2025-11', value: 62 }, { date: '2025-12', value: 78 },
    { date: '2026-01', value: 98 }, { date: '2026-02', value: 120 }, { date: '2026-03', value: 142 },
  ],
  workspaceGrowth: [
    { date: '2025-10', value: 28 }, { date: '2025-11', value: 40 }, { date: '2025-12', value: 52 },
    { date: '2026-01', value: 65 }, { date: '2026-02', value: 78 }, { date: '2026-03', value: 89 },
  ],
  invitesVsMessages: [
    { date: 'Mon', invites: 580, messages: 1100 }, { date: 'Tue', invites: 620, messages: 1250 },
    { date: 'Wed', invites: 710, messages: 1380 }, { date: 'Thu', invites: 690, messages: 1300 },
    { date: 'Fri', invites: 650, messages: 1190 }, { date: 'Sat', invites: 120, messages: 280 },
    { date: 'Sun', invites: 80, messages: 150 },
  ],
  planDistribution: [
    { plan: 'Free', count: 45 }, { plan: 'Pro', count: 38 }, { plan: 'Business', count: 22 }, { plan: 'Enterprise', count: 5 },
  ],
}

export const mockOwnerStats: OwnerStats = {
  totalLeads: 2480,
  activeCampaigns: 3,
  invitesSentToday: 28,
  messagesSentToday: 45,
  acceptedConnections: 320,
  replies: 75,
  enrichmentPending: 12,
  verificationPending: 8,
  campaignFunnel: [
    { step: 'Total Leads', count: 500 }, { step: 'Invited', count: 480 }, { step: 'Accepted', count: 320 },
    { step: 'Messaged', count: 310 }, { step: 'Replied', count: 75 }, { step: 'Booked', count: 18 },
  ],
  dailyActivity: [
    { date: 'Mon', invites: 45, messages: 82, replies: 12 }, { date: 'Tue', invites: 50, messages: 95, replies: 15 },
    { date: 'Wed', invites: 48, messages: 88, replies: 10 }, { date: 'Thu', invites: 42, messages: 78, replies: 8 },
    { date: 'Fri', invites: 38, messages: 72, replies: 14 }, { date: 'Sat', invites: 5, messages: 12, replies: 2 },
    { date: 'Sun', invites: 0, messages: 5, replies: 1 },
  ],
}
