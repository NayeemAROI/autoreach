import type { IntegrationStatus, LinkedInHealthStatus, AlertItem } from '@/types'

export const mockIntegrations: IntegrationStatus[] = []

export const mockLinkedInHealth: LinkedInHealthStatus = {
  connected: false,
  sessionHealth: 'unknown',
  inviteUsage: { used: 0, limit: 0 },
  messageUsage: { used: 0, limit: 0 },
  inboxSyncHealth: 'unknown',
  webhookHealth: 'unknown',
  recentEvents: [],
}

export const mockSystemAlerts: AlertItem[] = []
