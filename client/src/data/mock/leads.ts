import type { LeadRow, LeadDetails } from '@/types'

export const mockLeads: LeadRow[] = [
  { id: 'l-001', firstName: 'Daniel', lastName: 'Park', title: 'CTO', company: 'Vercel', linkedinUrl: 'https://linkedin.com/in/danielpark', email: 'daniel@vercel.com', enrichmentStatus: 'enriched', verificationStatus: 'verified', status: 'contacted', assignedCampaign: 'Q1 SaaS Founders Outreach', assignedCampaignId: 'c-001', source: 'csv', lastActivity: '2026-03-21T15:00:00Z', createdAt: '2026-01-10T10:00:00Z' },
  { id: 'l-002', firstName: 'Maria', lastName: 'Santos', title: 'VP Engineering', company: 'Stripe', linkedinUrl: 'https://linkedin.com/in/mariasantos', email: 'maria@stripe.com', enrichmentStatus: 'enriched', verificationStatus: 'verified', status: 'replied', assignedCampaign: 'Q1 SaaS Founders Outreach', assignedCampaignId: 'c-001', source: 'csv', lastActivity: '2026-03-21T12:30:00Z', createdAt: '2026-01-10T10:00:00Z' },
  { id: 'l-003', firstName: 'Raj', lastName: 'Kapoor', title: 'CEO', company: 'Notion', linkedinUrl: 'https://linkedin.com/in/rajkapoor', email: 'raj@notion.so', enrichmentStatus: 'enriched', verificationStatus: 'verified', status: 'contacted', assignedCampaign: 'Q1 SaaS Founders Outreach', assignedCampaignId: 'c-001', source: 'linkedin', lastActivity: '2026-03-22T05:00:00Z', createdAt: '2026-01-12T14:00:00Z' },
  { id: 'l-004', firstName: 'Sophie', lastName: 'Chang', title: 'Head of Growth', company: 'Linear', linkedinUrl: 'https://linkedin.com/in/sophiechang', enrichmentStatus: 'enriched', verificationStatus: 'invalid', status: 'bounced', source: 'csv', lastActivity: '2026-03-21T09:00:00Z', createdAt: '2026-01-15T08:00:00Z' },
  { id: 'l-005', firstName: 'Alex', lastName: 'Thompson', title: 'Co-Founder', company: 'Figma', linkedinUrl: 'https://linkedin.com/in/alexthompson', email: 'alex@figma.com', enrichmentStatus: 'enriched', verificationStatus: 'verified', status: 'converted', assignedCampaign: 'VP Sales Outreach', assignedCampaignId: 'c-007', source: 'manual', lastActivity: '2026-03-20T18:00:00Z', createdAt: '2025-11-20T10:00:00Z' },
  { id: 'l-006', firstName: 'Yuki', lastName: 'Tanaka', title: 'CTO', company: 'Datadog', linkedinUrl: 'https://linkedin.com/in/yukitanaka', enrichmentStatus: 'pending', verificationStatus: 'not_started', status: 'new', source: 'csv', createdAt: '2026-03-20T16:00:00Z' },
  { id: 'l-007', firstName: 'Carlos', lastName: 'Garcia', title: 'Director of Sales', company: 'HubSpot', linkedinUrl: 'https://linkedin.com/in/carlosgarcia', email: 'carlos@hubspot.com', enrichmentStatus: 'enriched', verificationStatus: 'verified', status: 'enriched', source: 'linkedin', createdAt: '2026-03-18T11:00:00Z' },
  { id: 'l-008', firstName: 'Emma', lastName: 'Wilson', title: 'VP Product', company: 'Atlassian', linkedinUrl: 'https://linkedin.com/in/emmawilson', email: 'emma@atlassian.com', enrichmentStatus: 'enriched', verificationStatus: 'verified', status: 'verified', assignedCampaign: 'Product-Led Growth Leaders', assignedCampaignId: 'c-010', source: 'csv', lastActivity: '2026-03-19T14:30:00Z', createdAt: '2026-03-10T09:00:00Z' },
  { id: 'l-009', firstName: 'Liam', lastName: 'O\'Brien', title: 'CEO', company: 'Intercom', linkedinUrl: 'https://linkedin.com/in/liamobrien', enrichmentStatus: 'failed', verificationStatus: 'not_started', status: 'new', source: 'api', createdAt: '2026-03-21T20:00:00Z' },
  { id: 'l-010', firstName: 'Amara', lastName: 'Osei', title: 'Founder', company: 'Paystack', linkedinUrl: 'https://linkedin.com/in/amaraosei', email: 'amara@paystack.com', enrichmentStatus: 'enriched', verificationStatus: 'pending', status: 'enriched', source: 'manual', createdAt: '2026-03-22T02:00:00Z' },
]

export const mockLeadDetails: LeadDetails = {
  ...mockLeads[0],
  about: 'Building the future of web infrastructure at Vercel. Previously engineering lead at Google Cloud. Passionate about developer experience and performance.',
  location: 'San Francisco, CA',
  connections: 2400,
  company_details: {
    name: 'Vercel',
    industry: 'Cloud Infrastructure',
    size: '501-1000',
    location: 'San Francisco, CA',
    website: 'https://vercel.com',
    linkedinUrl: 'https://linkedin.com/company/vercel',
  },
  campaignHistory: [
    { campaignName: 'Q1 SaaS Founders Outreach', status: 'in_progress', enrolledAt: '2026-01-15T10:00:00Z' },
  ],
  inboxHistory: [
    { preview: 'Hi Daniel, I noticed your work at Vercel...', sentAt: '2026-03-15T10:00:00Z', direction: 'out' },
    { preview: 'Thanks for connecting! What does your platform do?', sentAt: '2026-03-18T14:30:00Z', direction: 'in' },
    { preview: 'Great question! We help teams automate LinkedIn outreach...', sentAt: '2026-03-18T15:00:00Z', direction: 'out' },
  ],
  notes: [
    { text: 'Very responsive, interested in a demo next week', createdAt: '2026-03-19T09:00:00Z', createdBy: 'Nayeemur Rahman' },
    { text: 'Referred by Alex Thompson at Figma', createdAt: '2026-01-10T10:30:00Z', createdBy: 'Karim Ahmed' },
  ],
}
