import { useState, useEffect } from 'react'
import { PageHeader } from '@/components/shared/PageHeader'
import { HealthBadge } from '@/components/shared/StatusBadge'
import { useApi } from '@/hooks/useApi'
import { Cpu, Database, Terminal, HeartPulse, RotateCcw } from 'lucide-react'
import { QuickActionButton } from '@/components/shared/AlertStrip'
import { motion } from 'framer-motion'

export default function AdminSystemHealthPage() {
  const { data: healthData, refetch } = useApi<any>('/api/admin/health')
  const h = healthData || {}
  const db = h.database || {}
  const api = h.api || {}
  const mem = h.memory || {}

  const uptimeHours = h.uptime ? (h.uptime / 3600).toFixed(1) : '0'
  const heapMB = mem.heapUsed ? (mem.heapUsed / 1024 / 1024).toFixed(0) : '0'
  const rsssMB = mem.rss ? (mem.rss / 1024 / 1024).toFixed(0) : '0'

  // Auto-refresh every 30s
  useEffect(() => {
    const interval = setInterval(refetch, 30000)
    return () => clearInterval(interval)
  }, [refetch])

  const healthCards = [
    { title: 'Server', icon: Terminal, health: h.status || 'unknown', metrics: [
      { label: 'Status', value: h.status || 'unknown' },
      { label: 'Uptime', value: `${uptimeHours}h` },
      { label: 'Heap Used', value: `${heapMB} MB` },
      { label: 'RSS', value: `${rsssMB} MB` },
    ]},
    { title: 'Database', icon: Database, health: db.health || 'unknown', metrics: [
      { label: 'Size', value: `${db.sizeMB || 0} MB` },
      { label: 'Total Users', value: db.totalUsers || 0 },
      { label: 'Total Leads', value: db.totalLeads || 0 },
      { label: 'Total Campaigns', value: db.totalCampaigns || 0 },
    ]},
    { title: 'Campaign Engine', icon: Cpu, health: db.activeCampaigns > 0 ? 'healthy' : 'idle', metrics: [
      { label: 'Active Campaigns', value: db.activeCampaigns || 0 },
      { label: 'Total Campaigns', value: db.totalCampaigns || 0 },
      { label: 'Today Actions', value: api.todayActions || 0 },
      { label: 'Status', value: db.activeCampaigns > 0 ? 'Running' : 'Idle' },
    ]},
    { title: 'API', icon: HeartPulse, health: api.health || 'unknown', metrics: [
      { label: 'Health', value: api.health || 'unknown' },
      { label: 'Today Actions', value: api.todayActions || 0 },
      { label: 'Last Check', value: h.timestamp ? new Date(h.timestamp).toLocaleTimeString() : 'N/A' },
      { label: 'Active DB Users', value: db.totalUsers || 0 },
    ]},
  ]

  return (
    <div className="space-y-5">
      <PageHeader title="System Health" subtitle="Infrastructure and service monitoring">
        <QuickActionButton icon={<RotateCcw className="w-4 h-4" />} label="Refresh" onClick={refetch} variant="primary" />
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-4">
        {healthCards.map((card, i) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-2xl bg-zinc-900/60 border border-zinc-800/60 overflow-hidden"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800/40">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-zinc-800/80 flex items-center justify-center text-zinc-400">
                  <card.icon className="w-4.5 h-4.5" />
                </div>
                <h3 className="text-sm font-semibold text-white">{card.title}</h3>
              </div>
              <HealthBadge health={card.health as any} />
            </div>
            <div className="px-5 py-4 grid grid-cols-2 gap-3">
              {card.metrics.map(m => (
                <div key={m.label}>
                  <p className="text-[10px] text-zinc-600 uppercase tracking-wider">{m.label}</p>
                  <p className="text-sm font-semibold text-zinc-300 mt-0.5">{m.value}</p>
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
