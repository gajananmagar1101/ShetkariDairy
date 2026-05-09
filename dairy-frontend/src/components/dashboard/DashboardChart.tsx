import { memo } from 'react'
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

interface WeeklyTrend {
  name: string
  milk: number
  amount: number
}

function DashboardChartComponent({ data }: { data: WeeklyTrend[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="colorMilk" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} dy={10} />
        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} dx={-10} />
        <Tooltip
          contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
        />
        <Area type="monotone" dataKey="milk" stroke="#8b5cf6" strokeWidth={4} fillOpacity={1} fill="url(#colorMilk)" />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export default memo(DashboardChartComponent)
