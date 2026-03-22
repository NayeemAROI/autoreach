import type { InboxThreadSummary, InboxMessage, InboxThread } from '@/types'
import { mockLeads } from './leads'

export const mockInboxThreads: InboxThreadSummary[] = [
  { id: 'th-001', leadName: 'Maria Santos', leadTitle: 'VP Engineering', leadCompany: 'Stripe', lastMessage: 'That sounds really interesting! Can we schedule a call next week?', lastMessageAt: '2026-03-22T04:30:00Z', unread: true, campaignName: 'Q1 SaaS Founders Outreach', sentiment: 'positive', messageCount: 5 },
  { id: 'th-002', leadName: 'Daniel Park', leadTitle: 'CTO', leadCompany: 'Vercel', lastMessage: 'Thanks for connecting! What does your platform do exactly?', lastMessageAt: '2026-03-21T18:00:00Z', unread: true, campaignName: 'Q1 SaaS Founders Outreach', sentiment: 'neutral', messageCount: 3 },
  { id: 'th-003', leadName: 'Alex Thompson', leadTitle: 'Co-Founder', leadCompany: 'Figma', lastMessage: 'We already use a similar tool. Thanks though!', lastMessageAt: '2026-03-20T15:45:00Z', unread: false, campaignName: 'VP Sales Outreach', sentiment: 'not_interested', messageCount: 4 },
  { id: 'th-004', leadName: 'Emma Wilson', leadTitle: 'VP Product', leadCompany: 'Atlassian', lastMessage: 'Let me check with my team and get back to you.', lastMessageAt: '2026-03-20T10:20:00Z', unread: false, campaignName: 'Product-Led Growth Leaders', sentiment: 'follow_up', messageCount: 3 },
  { id: 'th-005', leadName: 'Carlos Garcia', leadTitle: 'Director of Sales', leadCompany: 'HubSpot', lastMessage: 'I\'d love to see a demo. How about Thursday at 2pm EST?', lastMessageAt: '2026-03-19T22:00:00Z', unread: false, sentiment: 'booked', messageCount: 6 },
  { id: 'th-006', leadName: 'Raj Kapoor', leadTitle: 'CEO', leadCompany: 'Notion', lastMessage: 'Hi Raj, I noticed your work at Notion...', lastMessageAt: '2026-03-22T05:00:00Z', unread: false, campaignName: 'Q1 SaaS Founders Outreach', sentiment: 'neutral', messageCount: 1 },
]

const thread1Messages: InboxMessage[] = [
  { id: 'msg-01', threadId: 'th-001', direction: 'out', content: 'Hi Maria, I noticed your incredible work at Stripe. I\'d love to connect and share how we\'re helping engineering leaders scale their outbound efforts.', sentAt: '2026-03-15T10:00:00Z', senderName: 'Nayeemur Rahman', read: true },
  { id: 'msg-02', threadId: 'th-001', direction: 'in', content: 'Thanks for reaching out! I\'m always interested in tools that can help our team.', sentAt: '2026-03-17T14:30:00Z', senderName: 'Maria Santos', read: true },
  { id: 'msg-03', threadId: 'th-001', direction: 'out', content: 'Great to hear! We help teams like Stripe run targeted LinkedIn campaigns with automatic sequencing, follow-ups, and inbox management. Would a quick demo be useful?', sentAt: '2026-03-17T15:00:00Z', senderName: 'Nayeemur Rahman', read: true },
  { id: 'msg-04', threadId: 'th-001', direction: 'in', content: 'That sounds really interesting! Can we schedule a call next week?', sentAt: '2026-03-22T04:30:00Z', senderName: 'Maria Santos', read: false },
]

export const mockInboxThread: InboxThread = {
  id: 'th-001',
  lead: mockLeads[1],
  messages: thread1Messages,
  sentiment: 'positive',
  campaignName: 'Q1 SaaS Founders Outreach',
}
