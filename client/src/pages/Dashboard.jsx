import { useState, useEffect, useRef } from 'react'
import {
  Users, Rocket, MessageSquare, TrendingUp,
  ArrowUpRight, ArrowDownRight, Send, UserCheck,
  Mail, Eye, MessageCircle, Activity, ChevronDown,
  Check, Calendar, X
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import { apiFetch } from '../utils/api'
import CustomCalendar from '../components/CustomCalendar'

const activityIcons = {
  connection_sent: { icon: Send, color: 'text-primary-light', bg: 'bg-primary/10' },
  connection_accepted: { icon: UserCheck, color: 'text-success', bg: 'bg-success/10' },
  message_sent: { icon: MessageSquare, color: 'text-info', bg: 'bg-info/10' },
  message_replied: { icon: MessageCircle, color: 'text-success', bg: 'bg-success/10' },
  email_sent: { icon: Mail, color: 'text-accent-light', bg: 'bg-accent/10' },
  email_opened: { icon: Eye, color: 'text-warning', bg: 'bg-warning/10' },
  profile_visited: { icon: Eye, color: 'text-text-muted', bg: 'bg-bg-elevated' },
}

function StatCard({ title, value, change, changeType, icon: Icon, delay }) {
  return (
    <div className={`stat-card animate-fade-in animate-fade-in-delay-${delay}`}>
      <div className="flex items-start justify-between mb-4">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary/20 to-accent/10 flex items-center justify-center">
          <Icon className="w-5 h-5 text-primary-light" />
        </div>
        {change !== undefined && (
          <div className={`flex items-center gap-1 text-xs font-semibold ${changeType === 'up' ? 'text-success' : 'text-danger'}`}>
            {changeType === 'up' ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
            {change}%
          </div>
        )}
      </div>
      <div className="text-3xl font-bold text-text-primary mb-1">{value}</div>
      <div className="text-sm text-text-muted">{title}</div>
    </div>
  )
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="glass-card p-3 border border-border-light !rounded-lg">
      <p className="text-xs text-text-muted mb-2">{label}</p>
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          <div className="w-2 h-2 rounded-full" style={{ background: entry.color }}></div>
          <span className="text-text-secondary capitalize">{entry.name}:</span>
          <span className="text-text-primary font-semibold">{entry.value}</span>
        </div>
      ))}
    </div>
  )
}

function timeAgo(timestamp) {
  const diff = Date.now() - new Date(timestamp).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [activities, setActivities] = useState([])
  const [chartData, setChartData] = useState([])
  const [campaigns, setCampaigns] = useState([])
  const [timeRange, setTimeRange] = useState('monthly')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [customRange, setCustomRange] = useState({ start: '', end: '' })
  const [showCustomPicker, setShowCustomPicker] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const TIME_OPTIONS = [
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'half_yearly', label: 'Half Yearly' },
    { value: 'yearly', label: 'Yearly' },
    { value: 'custom', label: 'Custom' },
  ]

  const fetchDashboardData = () => {
    const qs = new URLSearchParams()
    qs.append('range', timeRange)
    if (timeRange === 'custom' && customRange.start && customRange.end) {
      qs.append('start', customRange.start)
      qs.append('end', customRange.end)
    }

    Promise.all([
      apiFetch('/api/stats/overview').then(r => r.json()),
      apiFetch('/api/stats/activity').then(r => r.json()),
      apiFetch(`/api/stats/chart?${qs.toString()}`).then(r => r.json()),
      apiFetch('/api/campaigns').then(r => r.json()),
    ]).then(([statsData, actData, chartRes, campRes]) => {
      setStats(statsData)
      setActivities(actData.activities || [])
      setChartData(chartRes.data || [])
      setCampaigns(campRes.campaigns?.filter(c => c.status === 'active') || [])
    }).catch(err => console.error("Error loading dashboard data:", err))
  }

  useEffect(() => {
    fetchDashboardData()
  }, [timeRange, customRange])

  if (!stats) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-4 gap-5">
          {[1,2,3,4].map(i => (
            <div key={i} className="stat-card h-32 shimmer"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Dashboard</h1>
          <p className="text-sm text-text-muted mt-1">Overview of your outreach performance</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-text-muted">
          <div className="w-2 h-2 rounded-full bg-success pulse-dot"></div>
          Automation Active
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        <StatCard
          title="Total Leads"
          value={stats.totalLeads}
          change={12}
          changeType="up"
          icon={Users}
          delay={1}
        />
        <StatCard
          title="Active Campaigns"
          value={stats.activeCampaigns}
          icon={Rocket}
          delay={2}
        />
        <StatCard
          title="Connection Rate"
          value={`${stats.connectionRate}%`}
          change={5}
          changeType="up"
          icon={TrendingUp}
          delay={3}
        />
        <StatCard
          title="Reply Rate"
          value={`${stats.replyRate}%`}
          change={3}
          changeType="up"
          icon={MessageSquare}
          delay={4}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Chart */}
        <div className="xl:col-span-2 glass-card p-6 animate-fade-in">
          <div className="flex items-center justify-between mb-6">
            <div className="flex flex-col">
              <h2 className="text-sm font-semibold text-text-primary">Outreach Activity</h2>
              <div className="relative mt-0.5" ref={dropdownRef}>
                <button 
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-secondary transition-colors group cursor-pointer"
                >
                  {TIME_OPTIONS.find(o => o.value === timeRange)?.label} performance
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {isDropdownOpen && (
                  <div className="absolute top-full left-0 mt-2 w-40 p-1 bg-bg-elevated border border-border shadow-2xl rounded-xl z-[70] animate-in fade-in slide-in-from-top-1 duration-200">
                    {TIME_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => {
                          setTimeRange(option.value);
                          setIsDropdownOpen(false);
                          if (option.value === 'custom') setShowCustomPicker(true);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-[11px] transition-colors ${
                          timeRange === option.value 
                            ? 'bg-primary/10 text-primary font-medium' 
                            : 'text-text-secondary hover:bg-bg-surface hover:text-text-primary'
                        }`}
                      >
                        {option.label}
                        {timeRange === option.value && <Check className="w-3.5 h-3.5" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-primary"></div>
                <span className="text-text-muted">Connections</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-accent"></div>
                <span className="text-text-muted">Messages</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-success"></div>
                <span className="text-text-muted">Replies</span>
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="gradConnections" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradMessages" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradReplies" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e1e32" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 11, fill: '#5a5a7a' }} 
                tickFormatter={v => {
                  if (!v) return '';
                  if (v.includes(':')) return v; // Hourly format 00:00
                  return v.slice(5); // Date format MM-DD
                }} 
              />
              <YAxis tick={{ fontSize: 11, fill: '#5a5a7a' }} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="connections" stroke="#6366f1" strokeWidth={2} fill="url(#gradConnections)" />
              <Area type="monotone" dataKey="messages" stroke="#8b5cf6" strokeWidth={2} fill="url(#gradMessages)" />
              <Area type="monotone" dataKey="replies" stroke="#10b981" strokeWidth={2} fill="url(#gradReplies)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Activity Feed */}
        <div className="glass-card p-6 animate-fade-in">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-semibold text-text-primary">Recent Activity</h2>
            <Activity className="w-4 h-4 text-text-muted" />
          </div>
          <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
            {activities.slice(0, 10).map((act, i) => {
              const config = activityIcons[act.type] || activityIcons.profile_visited
              const IconComp = config.icon
              return (
                <div key={i} className="flex items-start gap-3 p-2 rounded-lg hover:bg-bg-hover transition-colors">
                  <div className={`w-8 h-8 rounded-lg ${config.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                    <IconComp className={`w-3.5 h-3.5 ${config.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-text-secondary leading-relaxed truncate">{act.detail}</p>
                    <p className="text-[11px] text-text-muted mt-0.5">{timeAgo(act.timestamp)}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Custom Date Picker Modal */}
      {showCustomPicker && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="glass-card w-full max-w-md p-6 border border-white/10 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-primary" />
                </div>
                <h3 className="text-sm font-bold text-text-primary">Select Custom Range</h3>
              </div>
              <button 
                onClick={() => setShowCustomPicker(false)}
                className="p-1 hover:bg-bg-surface rounded-lg transition-colors text-text-muted hover:text-text-primary"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-6">
              <div className="flex items-center justify-between px-1">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] uppercase tracking-wider text-text-muted font-bold">From</span>
                  <span className="text-sm font-semibold text-text-primary">{customRange.start || 'Select Date'}</span>
                </div>
                <div className="h-px w-8 bg-border"></div>
                <div className="flex flex-col gap-1 text-right">
                  <span className="text-[10px] uppercase tracking-wider text-text-muted font-bold">To</span>
                  <span className="text-sm font-semibold text-text-primary">{customRange.end || 'Select Date'}</span>
                </div>
              </div>

              <CustomCalendar 
                selectedRange={customRange}
                onRangeChange={(newRange) => setCustomRange(newRange)}
              />
            </div>

            <div className="mt-8 flex gap-3">
              <button 
                onClick={() => {
                  setCustomRange({ start: '', end: '' });
                  setShowCustomPicker(false);
                }}
                className="flex-1 btn bg-bg-surface hover:bg-bg-hover text-text-primary border-border"
              >
                Cancel
              </button>
              <button 
                disabled={!customRange.start || !customRange.end}
                onClick={() => setShowCustomPicker(false)}
                className="flex-1 btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Apply Range
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active Campaigns */}
      <div className="glass-card p-6 animate-fade-in">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-semibold text-text-primary">Active Campaigns</h2>
          <span className="text-xs text-text-muted">{campaigns.length} running</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {campaigns.map((camp) => {
            const total = camp.stats?.sent || 1
            const acceptRate = Math.round(((camp.stats?.accepted || 0) / total) * 100)
            const replyRate = Math.round(((camp.stats?.replied || 0) / total) * 100)
            return (
              <div key={camp.id} className="p-4 rounded-xl bg-bg-secondary border border-border hover:border-border-light transition-all">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-text-primary truncate pr-2">{camp.name}</h3>
                  <span className="badge badge-success">Active</span>
                </div>
                <div className="flex items-center gap-6 text-xs mb-3">
                  <div>
                    <span className="text-text-muted">Sent: </span>
                    <span className="text-text-primary font-semibold">{camp.stats?.sent || 0}</span>
                  </div>
                  <div>
                    <span className="text-text-muted">Accepted: </span>
                    <span className="text-success font-semibold">{acceptRate}%</span>
                  </div>
                  <div>
                    <span className="text-text-muted">Replied: </span>
                    <span className="text-primary-light font-semibold">{replyRate}%</span>
                  </div>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${acceptRate}%` }}></div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
