import { useState, useEffect, lazy, Suspense } from 'react'
import { Droplets, Users, IndianRupee, TrendingUp, Loader2 } from 'lucide-react'
import axios from 'axios'
import { getApiBaseUrl } from '../lib/api'
import { useSettingsStore } from '../store/settingsStore'
import { t } from '../utils/translations'

const DashboardChart = lazy(() => import('../components/dashboard/DashboardChart'))

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
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-800 dark:text-white">{t(language, 'dashboardOverview')}</h1>
        <p className="text-slate-500 dark:text-slate-300 font-medium mt-1">{t(language, 'dashboardDesc')}</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: t(language, 'totalMilkToday'), value: `${data.totalMilkToday.toFixed(1)} L`, icon: Droplets, color: 'text-blue-500 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-500/10' },
          { label: t(language, 'activeCustomers'), value: data.activeCustomers.toString(), icon: Users, color: 'text-violet-500 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-500/10' },
          { label: t(language, 'todaysCollectionDash'), value: `₹${data.todaysCollection.toFixed(2)}`, icon: IndianRupee, color: 'text-emerald-500 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
          { label: t(language, 'growth'), value: data.growth, icon: TrendingUp, color: 'text-orange-500 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-500/10' },
        ].map((stat, i) => (
          <div
            key={i}
            className="p-4 sm:p-6 rounded-[2rem] bg-white/40 dark:bg-slate-900/60 border border-white/60 dark:border-slate-700/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-xl transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:bg-white/60 dark:hover:bg-slate-800/80 group"
          >
            <div className="flex items-center gap-5">
              <div className={`p-4 rounded-[1.25rem] ${stat.bg} shadow-sm group-hover:scale-110 transition-transform duration-300`}>
                <stat.icon className={`w-7 h-7 ${stat.color}`} />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-500 dark:text-slate-300">{stat.label}</p>
                <h3 className="text-3xl font-extrabold text-slate-800 dark:text-white mt-1">{stat.value}</h3>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Chart Section */}
      <div className="p-4 sm:p-8 rounded-[2rem] bg-white/40 dark:bg-slate-900/60 border border-white/60 dark:border-slate-700/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-xl h-[400px] sm:h-[450px]">
        <h3 className="text-xl font-extrabold text-slate-800 dark:text-white mb-4 sm:mb-8">{t(language, 'weeklyTrends')}</h3>
        <Suspense
          fallback={
            <div className="flex h-[calc(100%-3rem)] items-center justify-center">
              <Loader2 className="h-7 w-7 animate-spin text-primary-500" />
            </div>
          }
        >
          <DashboardChart data={data.weeklyTrends} />
        </Suspense>
      </div>
    </div>
  )
}
