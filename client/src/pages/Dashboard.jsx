import { useState, useEffect, useRef } from 'react'
import {
  Users, Rocket, MessageSquare, TrendingUp,
  ArrowUpRight, ArrowDownRight, Send, UserCheck,
  Mail, Eye, MessageCircle, Activity, ChevronDown,
  Check, Calendar, X
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts'
import { apiFetch } from '../utils/api'
import { useAuth } from '../context/AuthContext'
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
  const [campaignFilter, setCampaignFilter] = useState('')
  const [breakdown, setBreakdown] = useState([])
  const [leadStatuses, setLeadStatuses] = useState([])
  const [userFilter, setUserFilter] = useState('')
  const [userList, setUserList] = useState([])
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)
  const userDropdownRef = useRef(null)
  const { user: currentUser } = useAuth()
  const isAdmin = currentUser?.role === 'admin'

  // Fetch user list for admin filter
  useEffect(() => {
    if (isAdmin) {
      apiFetch('/api/stats/users').then(r => r.json())
        .then(data => setUserList(data.users || []))
        .catch(() => {})
    }
  }, [isAdmin])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false)
      }
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target)) {
        setIsUserDropdownOpen(false)
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
    if (campaignFilter) qs.append('campaignId', campaignFilter)
    if (userFilter) qs.append('userId', userFilter)

    const userQs = userFilter ? `?userId=${userFilter}` : ''

    Promise.all([
      apiFetch(`/api/stats/overview${userQs}`).then(r => r.json()),
      apiFetch(`/api/stats/activity${userQs}`).then(r => r.json()),
      apiFetch(`/api/stats/chart?${qs.toString()}`).then(r => r.json()),
      apiFetch('/api/campaigns').then(r => r.json()),
      apiFetch(`/api/stats/campaign-breakdown${userQs}`).then(r => r.json()),
      apiFetch(`/api/stats/lead-status${userQs}`).then(r => r.json()),
    ]).then(([statsData, actData, chartRes, campRes, breakdownRes, leadStatusRes]) => {
      setStats(statsData)
      setActivities(actData.activities || [])
      setChartData(chartRes.data || [])
      setCampaigns(campRes.campaigns || [])
      setBreakdown(breakdownRes.breakdown || [])
      setLeadStatuses(leadStatusRes.statuses || [])
    }).catch(err => console.error("Error loading dashboard data:", err))
  }

  useEffect(() => {
    fetchDashboardData()
  }, [timeRange, customRange, campaignFilter, userFilter])

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
        <div className="flex items-center gap-3 text-xs text-text-muted">
          {/* Admin user filter */}
          {isAdmin && userList.length > 0 && (
            <div className="relative" ref={userDropdownRef}>
              <button
                onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] font-semibold transition-all border cursor-pointer hover:border-primary/50"
                style={{ background: 'var(--color-bg-elevated)', borderColor: userFilter ? 'var(--color-primary)' : 'var(--color-border)', color: userFilter ? 'var(--color-primary-light)' : 'var(--color-text-secondary)' }}
              >
                <Users className="w-3.5 h-3.5" />
                {userFilter ? userList.find(u => u.id === userFilter)?.name || 'User' : 'All Users'}
                <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isUserDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {isUserDropdownOpen && (
                <div className="absolute top-full right-0 mt-2 w-56 p-1 bg-bg-elevated border border-border shadow-2xl rounded-xl z-[70] animate-in fade-in slide-in-from-top-1 duration-200 max-h-64 overflow-y-auto">
                  <button
                    onClick={() => { setUserFilter(''); setIsUserDropdownOpen(false) }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-[11px] transition-colors ${
                      !userFilter ? 'bg-primary/10 text-primary font-medium' : 'text-text-secondary hover:bg-bg-surface hover:text-text-primary'
                    }`}
                  >
                    All Users (My Data)
                    {!userFilter && <Check className="w-3.5 h-3.5" />}
                  </button>
                  {userList.map(u => (
                    <button
                      key={u.id}
                      onClick={() => { setUserFilter(u.id); setIsUserDropdownOpen(false) }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-[11px] transition-colors ${
                        userFilter === u.id ? 'bg-primary/10 text-primary font-medium' : 'text-text-secondary hover:bg-bg-surface hover:text-text-primary'
                      }`}
                    >
                      <span className="truncate">{u.name}</span>
                      <span className="flex items-center gap-1.5">
                        {u.role === 'admin' && <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary/15 text-primary font-bold uppercase">Admin</span>}
                        {userFilter === u.id && <Check className="w-3.5 h-3.5" />}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          <div className="w-2 h-2 rounded-full bg-success pulse-dot"></div>
          Automation Active
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-5">
        <StatCard
          title="Total Leads"
          value={stats.totalLeads}
          change={Math.abs(stats.leadsChange)}
          changeType={stats.leadsChange >= 0 ? 'up' : 'down'}
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
          change={Math.abs(stats.connChange)}
          changeType={stats.connChange >= 0 ? 'up' : 'down'}
          icon={TrendingUp}
          delay={3}
        />
        <StatCard
          title="Reply Rate"
          value={`${stats.replyRate}%`}
          change={Math.abs(stats.replyChange)}
          changeType={stats.replyChange >= 0 ? 'up' : 'down'}
          icon={MessageSquare}
          delay={4}
        />
        <StatCard
          title="Today's Actions"
          value={stats.todayActions}
          icon={Activity}
          delay={5}
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
            <div className="flex items-center gap-3">
              {/* Campaign filter */}
              <select
                value={campaignFilter}
                onChange={e => setCampaignFilter(e.target.value)}
                className="text-[11px] px-3 py-1.5 rounded-lg bg-bg-secondary border border-border text-text-secondary cursor-pointer focus:outline-none focus:border-primary"
              >
                <option value="">All Campaigns</option>
                {campaigns.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
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

      {/* Bottom Row: Campaign Breakdown + Lead Status */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Campaign Breakdown Table */}
        <div className="xl:col-span-2 glass-card p-6 animate-fade-in">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-semibold text-text-primary">Campaign Performance</h2>
            <span className="text-xs text-text-muted">{breakdown.length} campaigns</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2.5 text-[10px] font-black uppercase tracking-widest text-text-muted">Campaign</th>
                  <th className="text-center py-2.5 text-[10px] font-black uppercase tracking-widest text-text-muted">Status</th>
                  <th className="text-center py-2.5 text-[10px] font-black uppercase tracking-widest text-text-muted">Leads</th>
                  <th className="text-center py-2.5 text-[10px] font-black uppercase tracking-widest text-text-muted">Sent</th>
                  <th className="text-center py-2.5 text-[10px] font-black uppercase tracking-widest text-text-muted">Accept %</th>
                  <th className="text-center py-2.5 text-[10px] font-black uppercase tracking-widest text-text-muted">Reply %</th>
                </tr>
              </thead>
              <tbody>
                {breakdown.map(c => {
                  const statusColor = c.status === 'active' ? 'text-success' : c.status === 'paused' ? 'text-warning' : 'text-text-muted'
                  return (
                    <tr key={c.id} className="border-b border-border/50 hover:bg-bg-hover transition-colors">
                      <td className="py-3 font-semibold text-text-primary max-w-[200px] truncate">{c.name}</td>
                      <td className="py-3 text-center"><span className={`font-bold uppercase text-[10px] ${statusColor}`}>{c.status}</span></td>
                      <td className="py-3 text-center text-text-secondary">{c.totalLeads}</td>
                      <td className="py-3 text-center text-text-secondary">{c.sent}</td>
                      <td className="py-3 text-center"><span className="font-bold text-success">{c.acceptRate}%</span></td>
                      <td className="py-3 text-center"><span className="font-bold text-primary-light">{c.replyRate}%</span></td>
                    </tr>
                  )
                })}
                {breakdown.length === 0 && (
                  <tr><td colSpan={6} className="py-8 text-center text-text-muted">No campaigns yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Lead Status Donut Chart */}
        <div className="glass-card p-6 animate-fade-in">
          <h2 className="text-sm font-semibold text-text-primary mb-5">Lead Distribution</h2>
          {leadStatuses.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={leadStatuses} dataKey="count" nameKey="status" cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} strokeWidth={0}>
                    {leadStatuses.map((entry, i) => {
                      const colors = { new: '#6366f1', pending: '#f59e0b', connected: '#10b981', replied: '#06b6d4', error: '#ef4444' }
                      return <Cell key={i} fill={colors[entry.status] || '#64748b'} />
                    })}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid #2a2a4a', borderRadius: '8px', fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap justify-center gap-3 mt-4">
                {leadStatuses.map((s, i) => {
                  const colors = { new: '#6366f1', pending: '#f59e0b', connected: '#10b981', replied: '#06b6d4', error: '#ef4444' }
                  return (
                    <div key={i} className="flex items-center gap-1.5 text-xs">
                      <div className="w-2 h-2 rounded-full" style={{ background: colors[s.status] || '#64748b' }}></div>
                      <span className="text-text-muted capitalize">{s.status}</span>
                      <span className="text-text-primary font-semibold">{s.count}</span>
                    </div>
                  )
                })}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-48 text-text-muted text-xs">No lead data</div>
          )}
        </div>
      </div>
    </div>
  )
}
