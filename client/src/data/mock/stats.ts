import type { SuperAdminStats, OwnerStats } from '@/types'

export const mockAdminStats: SuperAdminStats = {
  totalUsers: 0,
  activeWorkspaces: 0,
  liveCampaigns: 0,
  messagesSentToday: 0,
  invitesSentToday: 0,
  activePaidAccounts: 0,
  mrr: 0,
  userGrowth: [],
  workspaceGrowth: [],
  invitesVsMessages: [],
  planDistribution: [],
}

export const mockOwnerStats: OwnerStats = {
  totalLeads: 0,
  activeCampaigns: 0,
  invitesSentToday: 0,
  messagesSentToday: 0,
  acceptedConnections: 0,
  replies: 0,
  enrichmentPending: 0,
  verificationPending: 0,
  campaignFunnel: [],
  dailyActivity: [],
}
