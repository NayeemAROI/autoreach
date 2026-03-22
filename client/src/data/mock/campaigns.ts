import type { CampaignMonitorRow, CampaignSummary, CampaignDetail, CampaignLeadRow, SequenceStep } from '@/types'

export const mockCampaignMonitor: CampaignMonitorRow[] = [
  { id: 'c-001', name: 'Q1 SaaS Founders Outreach', workspaceName: 'Autoreach Main', workspaceId: 'ws-001', status: 'active', leadsInQueue: 142, sentToday: 28, replied: 5, failed: 1, nextRun: '2026-03-22T06:00:00Z', health: 'healthy', senderAccount: 'Nayeemur Rahman', createdAt: '2026-01-15T10:00:00Z' },
  { id: 'c-002', name: 'DevTool CTOs Campaign', workspaceName: 'Outbound Dev Team', workspaceId: 'ws-003', status: 'active', leadsInQueue: 380, sentToday: 45, replied: 12, failed: 0, nextRun: '2026-03-22T06:30:00Z', health: 'healthy', senderAccount: 'James Chen', createdAt: '2026-02-01T08:00:00Z' },
  { id: 'c-003', name: 'Agency Partner Recruitment', workspaceName: 'GrowthLab Agency', workspaceId: 'ws-006', status: 'active', leadsInQueue: 95, sentToday: 15, replied: 3, failed: 4, nextRun: '2026-03-22T07:00:00Z', health: 'warning', senderAccount: 'Aisha Patel', createdAt: '2026-02-15T14:00:00Z' },
  { id: 'c-004', name: 'Enterprise Decision Makers', workspaceName: 'ReachScale Enterprise', workspaceId: 'ws-007', status: 'active', leadsInQueue: 1200, sentToday: 85, replied: 22, failed: 0, nextRun: '2026-03-22T06:15:00Z', health: 'healthy', senderAccount: 'Tom Nakamura', createdAt: '2025-12-10T09:00:00Z' },
  { id: 'c-005', name: 'Startup Founder Connect', workspaceName: 'TechFlow Sales', workspaceId: 'ws-002', status: 'paused', leadsInQueue: 210, sentToday: 0, replied: 0, failed: 0, health: 'unknown', senderAccount: 'Sarah Mitchell', createdAt: '2026-03-01T11:00:00Z' },
  { id: 'c-006', name: 'Series A Fundraising Leads', workspaceName: 'DemandIO Team', workspaceId: 'ws-008', status: 'active', leadsInQueue: 67, sentToday: 10, replied: 2, failed: 8, nextRun: '2026-03-22T08:00:00Z', health: 'critical', senderAccount: 'Rachel Foster', createdAt: '2026-03-05T15:30:00Z' },
  { id: 'c-007', name: 'VP Sales Outreach', workspaceName: 'Autoreach Main', workspaceId: 'ws-001', status: 'completed', leadsInQueue: 0, sentToday: 0, replied: 45, failed: 3, health: 'healthy', senderAccount: 'Nayeemur Rahman', createdAt: '2025-11-20T10:00:00Z' },
  { id: 'c-008', name: 'Product Managers Network', workspaceName: 'Connect AI Ops', workspaceId: 'ws-005', status: 'failed', leadsInQueue: 150, sentToday: 0, replied: 0, failed: 150, health: 'critical', senderAccount: 'Michael Brooks', createdAt: '2026-03-10T09:00:00Z' },
]

const mockSequence: SequenceStep[] = [
  { id: 'seq-1', type: 'start', label: 'Start', config: {}, order: 0, stats: { sent: 500, delivered: 500, replied: 0, failed: 0 } },
  { id: 'seq-2', type: 'invite', label: 'Send Connection Request', config: { message: 'Hi {{firstName}}, I noticed your work at {{company}} — would love to connect.' }, order: 1, stats: { sent: 480, delivered: 465, replied: 0, failed: 15 } },
  { id: 'seq-3', type: 'wait', label: 'Wait 3 days', config: { days: 3 }, order: 2 },
  { id: 'seq-4', type: 'message', label: 'First Message', config: { message: 'Thanks for connecting, {{firstName}}! I wanted to share how our platform helps teams like {{company}} scale their LinkedIn outreach.' }, order: 3, stats: { sent: 320, delivered: 310, replied: 42, failed: 10 } },
  { id: 'seq-5', type: 'wait', label: 'Wait 5 days', config: { days: 5 }, order: 4 },
  { id: 'seq-6', type: 'follow_up', label: 'Follow-up 1', config: { message: 'Just following up, {{firstName}} — did you get a chance to look at what we do?' }, order: 5, stats: { sent: 180, delivered: 175, replied: 28, failed: 5 } },
  { id: 'seq-7', type: 'end', label: 'End Sequence', config: { stopOnReply: true }, order: 6 },
]

export const mockCampaignSummaries: CampaignSummary[] = [
  { id: 'c-001', name: 'Q1 SaaS Founders Outreach', status: 'active', senderAccount: 'Nayeemur Rahman', leadsInFlow: 500, invitesSent: 480, accepted: 320, replied: 75, nextAction: 'Send follow-ups', health: 'healthy', createdAt: '2026-01-15T10:00:00Z', createdBy: 'Nayeemur Rahman' },
  { id: 'c-009', name: 'Marketing Directors Pilot', status: 'draft', senderAccount: 'Nayeemur Rahman', leadsInFlow: 0, invitesSent: 0, accepted: 0, replied: 0, health: 'unknown', createdAt: '2026-03-20T14:00:00Z', createdBy: 'Karim Ahmed' },
  { id: 'c-007', name: 'VP Sales Outreach', status: 'completed', senderAccount: 'Nayeemur Rahman', leadsInFlow: 350, invitesSent: 350, accepted: 280, replied: 45, health: 'healthy', createdAt: '2025-11-20T10:00:00Z', createdBy: 'Nayeemur Rahman' },
  { id: 'c-010', name: 'Product-Led Growth Leaders', status: 'active', senderAccount: 'Nayeemur Rahman', leadsInFlow: 200, invitesSent: 120, accepted: 65, replied: 12, nextAction: 'Sending messages', health: 'healthy', createdAt: '2026-03-10T09:00:00Z', createdBy: 'Fatima Ali' },
  { id: 'c-011', name: 'CTO Roundtable Invites', status: 'paused', senderAccount: 'Nayeemur Rahman', leadsInFlow: 150, invitesSent: 50, accepted: 20, replied: 3, health: 'warning', createdAt: '2026-03-01T11:00:00Z', createdBy: 'Nayeemur Rahman' },
]

export const mockCampaignDetail: CampaignDetail = {
  ...mockCampaignSummaries[0],
  description: 'Targeting SaaS founders and co-founders who recently raised Series A funding.',
  sequence: mockSequence,
  dailyInviteLimit: 50,
  dailyMessageLimit: 100,
  activeDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
  activeHoursStart: '09:00',
  activeHoursEnd: '18:00',
  stopOnReply: true,
  totalLeads: 500,
  completedLeads: 180,
  errors: [
    { message: 'Rate limit exceeded on invite batch', timestamp: '2026-03-21T14:30:00Z' },
    { message: 'Failed to send message to 3 leads — session timeout', timestamp: '2026-03-20T10:15:00Z' },
  ],
}

export const mockCampaignLeads: CampaignLeadRow[] = [
  { id: 'cl-1', leadId: 'l-001', leadName: 'Daniel Park', company: 'Vercel', currentStep: 'Follow-up 1', status: 'in_progress', lastAction: 'Message sent', lastActionAt: '2026-03-21T15:00:00Z', nextAction: 'Send follow-up', replyStatus: 'none' },
  { id: 'cl-2', leadId: 'l-002', leadName: 'Maria Santos', company: 'Stripe', currentStep: 'First Message', status: 'completed', lastAction: 'Reply received', lastActionAt: '2026-03-21T12:30:00Z', replyStatus: 'positive' },
  { id: 'cl-3', leadId: 'l-003', leadName: 'Raj Kapoor', company: 'Notion', currentStep: 'Connection Request', status: 'in_progress', lastAction: 'Invite sent', lastActionAt: '2026-03-22T05:00:00Z', nextAction: 'Wait for acceptance', replyStatus: 'none' },
  { id: 'cl-4', leadId: 'l-004', leadName: 'Sophie Chang', company: 'Linear', currentStep: 'First Message', status: 'failed', lastAction: 'Message failed — account restricted', lastActionAt: '2026-03-21T09:00:00Z', replyStatus: 'none' },
  { id: 'cl-5', leadId: 'l-005', leadName: 'Alex Thompson', company: 'Figma', currentStep: 'End', status: 'completed', lastAction: 'Sequence completed', lastActionAt: '2026-03-20T18:00:00Z', replyStatus: 'neutral' },
  { id: 'cl-6', leadId: 'l-006', leadName: 'Yuki Tanaka', company: 'Datadog', currentStep: 'Connection Request', status: 'queued', nextAction: 'Send invite', replyStatus: 'none' },
]
