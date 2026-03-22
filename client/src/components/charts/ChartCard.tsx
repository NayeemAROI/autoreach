import { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { ResponsiveContainer, LineChart, Line, BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import { CHART_COLORS } from '@/lib/constants'

interface ChartCardProps {
  title: string
  subtitle?: string
  children: ReactNode
  className?: string
  action?: ReactNode
}

export function ChartCard({ title, subtitle, children, className, action }: ChartCardProps) {
  return (
    <div className={cn('rounded-2xl bg-zinc-900/60 border border-zinc-800/60 p-5', className)}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-white">{title}</h3>
          {subtitle && <p className="text-xs text-zinc-500 mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className="h-[220px]">{children}</div>
    </div>
  )
}

interface LineChartCardProps {
  title: string
  subtitle?: string
  data: Record<string, unknown>[]
  dataKey: string
  xKey?: string
  color?: string
  className?: string
}

export function LineChartCard({ title, subtitle, data, dataKey, xKey = 'date', color = CHART_COLORS[0], className }: LineChartCardProps) {
  return (
    <ChartCard title={title} subtitle={subtitle} className={className}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
          <XAxis dataKey={xKey} tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} width={40} />
          <Tooltip contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: '12px', fontSize: '12px' }} />
          <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

interface BarChartCardProps {
  title: string
  subtitle?: string
  data: Record<string, unknown>[]
  bars: { dataKey: string; color?: string }[]
  xKey?: string
  className?: string
}

export function BarChartCard({ title, subtitle, data, bars, xKey = 'date', className }: BarChartCardProps) {
  return (
    <ChartCard title={title} subtitle={subtitle} className={className}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
          <XAxis dataKey={xKey} tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} width={40} />
          <Tooltip contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: '12px', fontSize: '12px' }} />
          {bars.map((bar, i) => (
            <Bar key={bar.dataKey} dataKey={bar.dataKey} fill={bar.color || CHART_COLORS[i]} radius={[4, 4, 0, 0]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

interface DonutChartCardProps {
  title: string
  subtitle?: string
  data: { name: string; value: number }[]
  className?: string
}

export function DonutChartCard({ title, subtitle, data, className }: DonutChartCardProps) {
  return (
    <ChartCard title={title} subtitle={subtitle} className={className}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value" nameKey="name">
            {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
          </Pie>
          <Tooltip contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: '12px', fontSize: '12px' }} />
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}
