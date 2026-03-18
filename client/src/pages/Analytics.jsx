import { useState, useEffect } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell
} from 'recharts'
import {
  Send, UserCheck, MessageCircle, Trophy, TrendingUp, Filter,
  Lightbulb, ArrowRight, ChevronDown, Loader2, BarChart3
} from 'lucide-react'
import { apiFetch } from '../utils/api'

function StatCard({ title, value, rate, icon: Icon, color, delay }) {
  return (
    <div className={`stat-card animate-fade-in animate-fade-in-delay-${delay}`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center`}
          style={{ background: `${color}20` }}>
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
        {rate !== undefined && (
          <span className="text-xs font-bold px-2 py-1 rounded-lg"
            style={{ background: `${color}15`, color }}>{rate}%</span>
        )}
      </div>
      <div className="text-3xl font-bold text-text-primary mb-1">{value}</div>
      <div className="text-sm text-text-muted">{title}</div>
    </div>
  )
}

function FunnelChart({ data }) {
  if (!data?.length) return null
  const maxVal = Math.max(...data.map(d => d.count), 1)

  return (
    <div className="space-y-3">
      {data.map((item, i) => {
        const widthPct = Math.max((item.count / maxVal) * 100, 8)
        const nextCount = data[i + 1]?.count ?? null
        const dropoff = nextCount !== null && item.count > 0
          ? ((1 - nextCount / item.count) * 100).toFixed(0) : null

        return (
          <div key={item.stage} className="group">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-medium text-text-secondary">{item.stage}</span>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-text-primary">{item.count}</span>
                {dropoff && (
                  <span className="text-[10px] text-text-muted opacity-0 group-hover:opacity-100 transition-opacity">
                    -{dropoff}% drop
                  </span>
                )}
              </div>
            </div>
            <div className="h-8 rounded-lg bg-bg-elevated overflow-hidden">
              <div
                className="h-full rounded-lg transition-all duration-700 ease-out flex items-center justify-end pr-2"
                style={{ width: `${widthPct}%`, background: `linear-gradient(90deg, ${item.color}90, ${item.color})` }}
              >
                {widthPct > 20 && (
                  <span className="text-[10px] font-bold text-white/80">{((item.count / maxVal) * 100).toFixed(0)}%</span>
                )}
              </div>
            </div>
            {i < data.length - 1 && (
              <div className="flex justify-center py-0.5">
                <ArrowRight className="w-3 h-3 text-text-muted rotate-90" />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function InsightCard({ insight }) {
  const colors = {
    success: { bg: 'bg-success/10', border: 'border-success/20', text: 'text-success' },
    warning: { bg: 'bg-warning/10', border: 'border-warning/20', text: 'text-warning' },
    danger: { bg: 'bg-danger/10', border: 'border-danger/20', text: 'text-danger' },
    info: { bg: 'bg-primary/10', border: 'border-primary/20', text: 'text-primary-light' },
  }
  const c = colors[insight.type] || colors.info

  return (
    <div className={`p-4 rounded-xl border ${c.bg} ${c.border}`}>
      <div className="flex items-start gap-3">
        <span className="text-xl">{insight.icon}</span>
        <div>
          <h4 className={`text-sm font-semibold ${c.text} mb-1`}>{insight.title}</h4>
          <p className="text-xs text-text-secondary leading-relaxed">{insight.text}</p>
        </div>
      </div>
    </div>
  )
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="glass-card p-3 border border-border-light !rounded-lg">
      <p className="text-xs text-text-muted mb-2">{label}</p>
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          <div className="w-2 h-2 rounded-full" style={{ background: entry.color }} />
          <span className="text-text-secondary capitalize">{entry.name}:</span>
          <span className="text-text-primary font-semibold">{entry.value}</span>
        </div>
      ))}
    </div>
  )
}

export default function Analytics() {
  const [overview, setOverview] = useState(null)
  const [timeseries, setTimeseries] = useState([])
  const [insights, setInsights] = useState([])
  const [campaigns, setCampaigns] = useState([])
  const [breakdown, setBreakdown] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedCampaign, setSelectedCampaign] = useState('')
  const [timeRange, setTimeRange] = useState(30)
  const [showFilter, setShowFilter] = useState(false)

  const fetchData = async () => {
    try {
      const params = new URLSearchParams({ days: timeRange })
      if (selectedCampaign) params.set('campaignId', selectedCampaign)

      const [ovRes, tsRes, insRes, campRes, bdRes] = await Promise.all([
        apiFetch(`/api/stats/analytics/overview?${params}`),
        apiFetch(`/api/stats/analytics/timeseries?${params}`),
        apiFetch('/api/stats/analytics/insights'),
        apiFetch('/api/campaigns'),
        apiFetch('/api/stats/campaign-breakdown'),
      ])

      if (ovRes.ok) setOverview(await ovRes.json())
      if (tsRes.ok) { const d = await tsRes.json(); setTimeseries(d.data || []) }
      if (insRes.ok) { const d = await insRes.json(); setInsights(d.insights || []) }
      if (campRes.ok) { const d = await campRes.json(); setCampaigns(d.campaigns || []) }
      if (bdRes.ok) { const d = await bdRes.json(); setBreakdown(d.breakdown || []) }
    } catch (err) {
      console.error('Analytics fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [selectedCampaign, timeRange])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-[1400px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-3">
            <BarChart3 className="w-7 h-7 text-primary" />
            Analytics
          </h1>
          <p className="text-sm text-text-muted mt-1">Track your outreach performance and conversion funnel</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Time Range */}
          <select
            value={timeRange}
            onChange={e => setTimeRange(parseInt(e.target.value))}
            className="px-3 py-2 rounded-xl bg-bg-secondary border border-border text-sm text-text-primary focus:border-primary outline-none"
          >
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>

          {/* Campaign Filter */}
          <div className="relative">
            <button
              onClick={() => setShowFilter(!showFilter)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-bg-secondary border border-border text-sm text-text-secondary hover:border-primary transition-colors"
            >
              <Filter className="w-4 h-4" />
              {selectedCampaign ? campaigns.find(c => c.id === selectedCampaign)?.name || 'Campaign' : 'All Campaigns'}
              <ChevronDown className="w-3 h-3" />
            </button>
            {showFilter && (
              <div className="absolute right-0 top-full mt-1 w-56 bg-bg-secondary border border-border rounded-xl shadow-lg z-10 py-1">
                <button onClick={() => { setSelectedCampaign(''); setShowFilter(false) }}
                  className="w-full px-3 py-2 text-left text-sm text-text-secondary hover:bg-bg-elevated">All Campaigns</button>
                {campaigns.map(c => (
                  <button key={c.id} onClick={() => { setSelectedCampaign(c.id); setShowFilter(false) }}
                    className="w-full px-3 py-2 text-left text-sm text-text-secondary hover:bg-bg-elevated truncate">{c.name}</button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard title="Connections Sent" value={overview?.sent || 0} rate={overview?.acceptanceRate} icon={Send} color="#6C5CE7" delay={1} />
        <StatCard title="Accepted" value={overview?.accepted || 0} rate={overview?.replyRate} icon={UserCheck} color="#00B894" delay={2} />
        <StatCard title="Replies" value={overview?.replied || 0} rate={overview?.conversionRate} icon={MessageCircle} color="#0984E3" delay={3} />
        <StatCard title="Converted" value={overview?.converted || 0} icon={Trophy} color="#E17055" delay={4} />
      </div>

      {/* Main Grid: Funnel + Time Series */}
      <div className="grid grid-cols-3 gap-6">
        {/* Funnel */}
        <div className="glass-card p-6 rounded-2xl">
          <h3 className="text-base font-semibold text-text-primary mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            Conversion Funnel
          </h3>
          <FunnelChart data={overview?.funnel || []} />
        </div>

        {/* Time Series */}
        <div className="glass-card p-6 rounded-2xl col-span-2">
          <h3 className="text-base font-semibold text-text-primary mb-4">Activity Over Time</h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={timeseries}>
              <defs>
                <linearGradient id="gSent" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6C5CE7" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#6C5CE7" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gAccepted" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00B894" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#00B894" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gReplies" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0984E3" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#0984E3" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" tick={{ fill: '#8B8FA3', fontSize: 10 }} tickFormatter={d => d?.slice(5)} />
              <YAxis tick={{ fill: '#8B8FA3', fontSize: 10 }} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="sent" name="Sent" stroke="#6C5CE7" fill="url(#gSent)" strokeWidth={2} />
              <Area type="monotone" dataKey="accepted" name="Accepted" stroke="#00B894" fill="url(#gAccepted)" strokeWidth={2} />
              <Area type="monotone" dataKey="replies" name="Replies" stroke="#0984E3" fill="url(#gReplies)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Campaign Breakdown + Smart Insights */}
      <div className="grid grid-cols-3 gap-6">
        {/* Campaign Breakdown */}
        <div className="glass-card p-6 rounded-2xl col-span-2">
          <h3 className="text-base font-semibold text-text-primary mb-4">Campaign Performance</h3>
          {breakdown.length === 0 ? (
            <p className="text-sm text-text-muted">No campaigns yet. Create one to see performance data.</p>
          ) : (
            <div className="overflow-hidden rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-bg-elevated">
                    <th className="text-left px-4 py-3 text-text-muted font-medium">Campaign</th>
                    <th className="text-center px-3 py-3 text-text-muted font-medium">Status</th>
                    <th className="text-center px-3 py-3 text-text-muted font-medium">Leads</th>
                    <th className="text-center px-3 py-3 text-text-muted font-medium">Sent</th>
                    <th className="text-center px-3 py-3 text-text-muted font-medium">Accept %</th>
                    <th className="text-center px-3 py-3 text-text-muted font-medium">Reply %</th>
                  </tr>
                </thead>
                <tbody>
                  {breakdown.map(c => (
                    <tr key={c.id} className="border-t border-border hover:bg-bg-elevated/50 transition-colors">
                      <td className="px-4 py-3 text-text-primary font-medium truncate max-w-[200px]">{c.name}</td>
                      <td className="text-center px-3 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          c.status === 'active' ? 'bg-success/10 text-success' :
                          c.status === 'paused' ? 'bg-warning/10 text-warning' : 'bg-bg-elevated text-text-muted'
                        }`}>{c.status}</span>
                      </td>
                      <td className="text-center px-3 py-3 text-text-secondary">{c.totalLeads}</td>
                      <td className="text-center px-3 py-3 text-text-secondary">{c.sent}</td>
                      <td className="text-center px-3 py-3">
                        <span className={`font-semibold ${c.acceptRate >= 30 ? 'text-success' : c.acceptRate >= 15 ? 'text-warning' : 'text-text-muted'}`}>
                          {c.acceptRate}%
                        </span>
                      </td>
                      <td className="text-center px-3 py-3">
                        <span className={`font-semibold ${c.replyRate >= 15 ? 'text-success' : c.replyRate >= 5 ? 'text-warning' : 'text-text-muted'}`}>
                          {c.replyRate}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Smart Insights */}
        <div className="glass-card p-6 rounded-2xl">
          <h3 className="text-base font-semibold text-text-primary mb-4 flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-warning" />
            Smart Insights
          </h3>
          <div className="space-y-3">
            {insights.map((insight, i) => (
              <InsightCard key={i} insight={insight} />
            ))}
          </div>
        </div>
      </div>

      {/* Messaging Metrics */}
      <div className="glass-card p-6 rounded-2xl">
        <h3 className="text-base font-semibold text-text-primary mb-4">Messaging Metrics</h3>
        <div className="grid grid-cols-4 gap-6">
          <div className="text-center p-4 rounded-xl bg-bg-elevated">
            <div className="text-2xl font-bold text-primary mb-1">{overview?.msgSent || 0}</div>
            <div className="text-xs text-text-muted">Messages Sent</div>
          </div>
          <div className="text-center p-4 rounded-xl bg-bg-elevated">
            <div className="text-2xl font-bold text-success mb-1">{overview?.replied || 0}</div>
            <div className="text-xs text-text-muted">Replies Received</div>
          </div>
          <div className="text-center p-4 rounded-xl bg-bg-elevated">
            <div className="text-2xl font-bold text-info mb-1">{overview?.msgReplyRate || 0}%</div>
            <div className="text-xs text-text-muted">Reply Rate</div>
          </div>
          <div className="text-center p-4 rounded-xl bg-bg-elevated">
            <div className="text-2xl font-bold text-accent mb-1">—</div>
            <div className="text-xs text-text-muted">Avg Reply Time</div>
          </div>
        </div>
      </div>
    </div>
  )
}
