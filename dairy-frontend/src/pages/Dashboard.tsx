import { useState, useEffect, lazy, Suspense } from 'react'
import { Droplets, Users, IndianRupee, TrendingUp } from 'lucide-react'
import { motion } from 'framer-motion'
import axios from 'axios'
import { getApiBaseUrl } from '../lib/api'
import { useSettingsStore } from '../store/settingsStore'
import { t } from '../utils/translations'
import { LoadingBlock, LoadingSpinner } from '../components/ui/loading'
import { getCachedViewData, setCachedViewData } from '../lib/viewCache'

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

const DASHBOARD_CACHE_KEY = 'view-cache-dashboard-summary'
const DASHBOARD_CACHE_TTL_MS = 60_000

type DashboardProps = {
  animationStage?: string | null
  showCards?: boolean
  showChart?: boolean
}

export default function Dashboard({ animationStage = null, showCards = true, showChart = true }: DashboardProps) {
  const { language } = useSettingsStore()
  const [data, setData] = useState<DashboardSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const isAnimating = animationStage !== null

  useEffect(() => {
    const cached = getCachedViewData<DashboardSummary>(DASHBOARD_CACHE_KEY, DASHBOARD_CACHE_TTL_MS)
    if (cached) {
      setData(cached)
      setIsLoading(false)
      void fetchDashboardSummary(false)
      return
    }

    void fetchDashboardSummary(true)
  }, [])

  const fetchDashboardSummary = async (showLoader = true) => {
    if (showLoader) {
      setIsLoading(true)
    }
    try {
      const res = await axios.get('/api/dashboard/summary')
      if (res.data.success) {
        setData(res.data.data)
        setCachedViewData(DASHBOARD_CACHE_KEY, res.data.data)
      } else {
        setError(t(language, 'dashboardApiUnexpected'))
      }
    } catch (err: any) {
      console.error(err)
      setError(err.response?.data?.message || err.message || t(language, 'failedServerConnect'))
    } finally {
      if (showLoader) {
        setIsLoading(false)
      }
    }
  }

  if (isLoading) {
    return <LoadingBlock label={t(language, 'loadingDashboard')} minHeightClassName="min-h-[60vh]" />
  }

  if (error || !data) {
    return (
      <div className="w-full h-[60vh] flex flex-col items-center justify-center space-y-4">
        <div className="soft-card rounded-[20px] p-6 max-w-md text-center">
          <h3 className="font-bold mb-2 text-red-600 dark:text-red-400">{t(language, 'connectionError')}</h3>
          <p className="text-sm text-[#6B7280] dark:text-slate-400">{error || t(language, 'couldNotLoadData')}</p>
          <p className="text-xs mt-4 text-[#9CA3AF] dark:text-slate-500">
            {t(language, 'currentApiUrl')}: {getApiBaseUrl()}
          </p>
        </div>
      </div>
    )
  }

  return (
    <motion.div
      layoutId={isAnimating ? "dashboard-content" : undefined}
      className="space-y-6"
    >
      {/* Header */}
      <motion.div
        layoutId={isAnimating ? "dashboard-header" : undefined}
        initial={isAnimating ? { opacity: 0, y: -10 } : false}
        animate={isAnimating ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      >
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
          {t(language, 'dashboardOverview')}
        </h1>
        <p className="mt-2 max-w-3xl text-[14px] text-slate-500 dark:text-slate-400 leading-relaxed">
          {t(language, 'dashboardDesc')}
        </p>
      </motion.div>

      {/* Stats cards */}
      {showCards && (
        <motion.div
          className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4"
          initial={isAnimating ? { opacity: 0 } : false}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        >
        {[
          { label: t(language, 'totalMilkToday'), value: `${data.totalMilkToday.toFixed(1)} L`, icon: Droplets, color: 'text-blue-500 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-500/10' },
          { label: t(language, 'activeCustomers'), value: data.activeCustomers.toString(), icon: Users, color: 'text-violet-500 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-500/10' },
          { label: t(language, 'todaysCollectionDash'), value: `₹${data.todaysCollection.toFixed(2)}`, icon: IndianRupee, color: 'text-emerald-500 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
          { label: t(language, 'growth'), value: data.growth, icon: TrendingUp, color: 'text-orange-500 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-500/10' },
        ].map((stat, i) => (
          <motion.div
            key={i}
            layoutId={isAnimating ? `stat-card-${i}` : undefined}
            initial={isAnimating ? { opacity: 0, scale: 0.95, y: 10 } : false}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{
              type: 'spring',
              stiffness: 160,
              damping: 20,
              delay: i * 0.08,
            }}
            whileHover={{ y: -4, transition: { duration: 0.3 } }}
            className="group rounded-[20px] bg-white p-4 shadow-[0_4px_24px_rgba(0,0,0,0.04)] transition-all duration-400 hover:shadow-[0_20px_60px_rgba(0,0,0,0.08)] sm:p-5 dark:bg-[#111111] dark:shadow-[0_4px_24px_rgba(0,0,0,0.3)] dark:hover:shadow-[0_20px_60px_rgba(0,0,0,0.4)]"
          >
            <div className="flex items-center gap-4">
              <div className={`shrink-0 p-3.5 rounded-xl ${stat.bg} transition-transform duration-300 group-hover:scale-105`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
              <div className="min-w-0">
                <p className="text-[12px] font-semibold text-slate-500 dark:text-slate-400 leading-snug">
                  {stat.label}
                </p>
                <h3 className="mt-1 whitespace-nowrap text-[1.5rem] font-bold leading-none tracking-tight text-slate-900 dark:text-white">
                  {stat.value}
                </h3>
              </div>
            </div>
          </motion.div>
        ))}
        </motion.div>
      )}

      {/* Chart */}
      {showChart && (
        <motion.div
          layoutId={isAnimating ? "dashboard-chart" : undefined}
          initial={isAnimating ? { opacity: 0, scale: 0.98, y: 12 } : false}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 150, damping: 20, delay: 0.3 }}
          className="h-[380px] rounded-[20px] bg-white p-5 shadow-[0_4px_24px_rgba(0,0,0,0.04)] sm:h-[430px] sm:p-7 dark:bg-[#111111] dark:shadow-[0_4px_24px_rgba(0,0,0,0.3)]"
        >
        <h3 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white mb-4 sm:mb-6">{t(language, 'weeklyTrends')}</h3>
        <Suspense
          fallback={
            <div className="flex h-[calc(100%-3rem)] items-center justify-center">
              <LoadingSpinner />
            </div>
          }
        >
          <DashboardChart data={data.weeklyTrends} />
        </Suspense>
        </motion.div>
      )}
    </motion.div>
  )
}
