import type { IntegrationStatus, LinkedInHealthStatus, AlertItem } from '@/types'

export const mockIntegrations: IntegrationStatus[] = [
  { name: 'Unipile', slug: 'unipile', health: 'operational', lastEventAt: '2026-03-22T05:29:00Z', failureCount: 2, description: 'LinkedIn automation and messaging API', configuredAt: '2025-08-15T10:00:00Z', details: { connectedAccounts: 14, staleSessions: 1, rateLimitIncidents: 3, webhookHealth: 'operational' } },
  { name: 'Stripe', slug: 'stripe', health: 'operational', lastEventAt: '2026-03-22T04:45:00Z', failureCount: 1, description: 'Payment processing and subscription management', configuredAt: '2025-08-15T10:00:00Z', details: { webhookHealth: 'operational', recentFailedEvents: 1 } },
  { name: 'Lead Verification', slug: 'verification', health: 'degraded', lastEventAt: '2026-03-21T18:00:00Z', failureCount: 8, description: 'Email bounce detection and lead quality scoring', configuredAt: '2026-01-05T09:00:00Z', details: { provider: 'Placeholder', queuedVerifications: 42 } },
]

export const mockLinkedInHealth: LinkedInHealthStatus = {
  connected: true, accountName: 'Nayeemur Rahman', accountId: 'acc-unipile-001', sessionHealth: 'healthy', lastSyncAt: '2026-03-22T05:29:00Z',
  inviteUsage: { used: 28, limit: 50 }, messageUsage: { used: 45, limit: 100 }, inboxSyncHealth: 'operational', webhookHealth: 'operational',
  recentEvents: [
    { type: 'sync', message: 'Inbox synced — 12 new messages', timestamp: '2026-03-22T05:29:00Z' },
    { type: 'invite', message: '28 invites sent today', timestamp: '2026-03-22T05:00:00Z' },
    { type: 'warning', message: 'Rate limit warning — approaching daily invite cap', timestamp: '2026-03-22T04:45:00Z' },
    { type: 'error', message: 'Failed to send invite — recipient unavailable', timestamp: '2026-03-21T14:30:00Z' },
  ],
}

export const mockSystemAlerts: AlertItem[] = [
  { id: 'sa-001', level: 'warning', title: 'LinkedIn Session Stale', message: 'Michael Brooks has a stale LinkedIn session.', timestamp: '2026-03-22T03:00:00Z', source: 'Unipile', dismissed: false, actionLabel: 'View', actionHref: '/admin/users' },
  { id: 'sa-002', level: 'error', title: 'Payment Failed', message: 'Stripe payment failed for Connect AI Ops ($49).', timestamp: '2026-03-20T09:00:00Z', source: 'Stripe', dismissed: false, actionLabel: 'View Billing', actionHref: '/admin/billing' },
  { id: 'sa-003', level: 'critical', title: 'Campaign Engine Failure', message: 'Campaign "Product Managers Network" failed — 150 invites dropped.', timestamp: '2026-03-21T22:00:00Z', source: 'Engine', dismissed: false, actionLabel: 'Inspect', actionHref: '/admin/campaign-monitor' },
  { id: 'sa-004', level: 'warning', title: 'Verification Degraded', message: 'Lead verification provider returning errors. 42 queued.', timestamp: '2026-03-21T18:00:00Z', source: 'Verification', dismissed: false },
  { id: 'sa-005', level: 'info', title: 'Invite Cap Approaching', message: 'Autoreach Main used 90% of daily invite quota.', timestamp: '2026-03-22T04:45:00Z', source: 'Unipile', dismissed: true },
]
