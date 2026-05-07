import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Droplets, Users, IndianRupee, TrendingUp, Loader2 } from 'lucide-react'
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import axios from 'axios'
import { getApiBaseUrl } from '../lib/api'
import { useSettingsStore } from '../store/settingsStore'
import { t } from '../utils/translations'

interface WeeklyTrend {
  name: string
  milk: number
  amount: number
}

interface DashboardSummary {
  totalMilkToday: number
  activeCustomers: number
  todaysCollection: number
  growth: string
  weeklyTrends: WeeklyTrend[]
}

export default function Dashboard() {
  const { language } = useSettingsStore()
  const [data, setData] = useState<DashboardSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchDashboardSummary()
  }, [])

  const fetchDashboardSummary = async () => {
    try {
      const res = await axios.get('/api/dashboard/summary')
      if (res.data.success) {
        setData(res.data.data)
      } else {
        setError('Dashboard API returned an unexpected response.')
      }
    } catch (err: any) {
      console.error(err)
      setError(err.response?.data?.message || err.message || 'Failed to connect to the server.')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="w-full h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="w-full h-[60vh] flex flex-col items-center justify-center space-y-4">
        <div className="bg-red-50 text-red-500 p-4 rounded-xl border border-red-100 max-w-md text-center">
          <h3 className="font-bold mb-2">Connection Error</h3>
          <p className="text-sm">{error || 'Could not load data'}</p>
          <p className="text-xs mt-4 text-red-400">
            Current API URL: {getApiBaseUrl()}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-800">{t(language, 'dashboardOverview')}</h1>
        <p className="text-slate-500 font-medium mt-1">{t(language, 'dashboardDesc')}</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: t(language, 'totalMilkToday'), value: `${data.totalMilkToday.toFixed(1)} L`, icon: Droplets, color: 'text-blue-500', bg: 'bg-blue-50' },
          { label: t(language, 'activeCustomers'), value: data.activeCustomers.toString(), icon: Users, color: 'text-violet-500', bg: 'bg-violet-50' },
          { label: t(language, 'todaysCollectionDash'), value: `₹${data.todaysCollection.toFixed(2)}`, icon: IndianRupee, color: 'text-emerald-500', bg: 'bg-emerald-50' },
          { label: t(language, 'growth'), value: data.growth, icon: TrendingUp, color: 'text-orange-500', bg: 'bg-orange-50' },
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="p-4 sm:p-6 rounded-[2rem] bg-white/40 border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-xl transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:bg-white/60 group"
          >
            <div className="flex items-center gap-5">
              <div className={`p-4 rounded-[1.25rem] ${stat.bg} shadow-sm group-hover:scale-110 transition-transform duration-300`}>
                <stat.icon className={`w-7 h-7 ${stat.color}`} />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-500">{stat.label}</p>
                <h3 className="text-3xl font-extrabold text-slate-800 mt-1">{stat.value}</h3>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Chart Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="p-4 sm:p-8 rounded-[2rem] bg-white/40 border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-xl h-[400px] sm:h-[450px]"
      >
        <h3 className="text-xl font-extrabold text-slate-800 mb-4 sm:mb-8">{t(language, 'weeklyTrends')}</h3>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data.weeklyTrends} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorMilk" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4}/>
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b'}} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b'}} dx={-10} />
            <Tooltip 
              contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            />
            <Area type="monotone" dataKey="milk" stroke="#8b5cf6" strokeWidth={4} fillOpacity={1} fill="url(#colorMilk)" />
          </AreaChart>
        </ResponsiveContainer>
      </motion.div>
    </div>
  )
}
