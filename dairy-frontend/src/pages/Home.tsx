import { useState, useEffect } from 'react'
import { ArrowRight, BriefcaseBusiness, Clock3, Droplets, IndianRupee, Users, FileText, CreditCard } from 'lucide-react'
import { Logo } from '../components/ui/Logo'
import { motion } from 'framer-motion'
import axios from 'axios'
import { getApiBaseUrl } from '../lib/api'
import { useSettingsStore } from '../store/settingsStore'
import { t } from '../utils/translations'
import { getCachedViewData, setCachedViewData } from '../lib/viewCache'
import { useNavigate } from 'react-router-dom'
import {
  AnimatedNumber,
  dashboardSection,
  dashboardStagger,
  riseIn,
  slideInLeft,
  slideInRight,
  fadeDown,
} from '../components/animation/dashboardMotion'

interface DashboardSummary {
  totalMilkToday: number
  activeCustomers: number
  todaysCollection: number
  growth: string
  weeklyTrends: Array<{ name: string; milk: number; amount: number }>
}

interface HomeActivityItem {
  id: string
  title: string
  detail: string
  icon: typeof Clock3
  accent: string
  accentDark: string
}

interface HomeMilkEntry {
  id: string
  customerName: string
  morningQuantity: number
  eveningQuantity: number
  totalAmount: number
}

interface HomeAttendanceItem {
  workerId: string
  workerName: string
  status: 'PRESENT' | 'ABSENT' | 'HALF_DAY' | null
}

interface HomePayment {
  id: string
  customerName: string
  amount: number
  paymentDate: string
}

const DASHBOARD_CACHE_KEY = 'view-cache-dashboard-summary'
const DASHBOARD_CACHE_TTL_MS = 60_000

const EMPTY_SUMMARY: DashboardSummary = {
  totalMilkToday: 0,
  activeCustomers: 0,
  todaysCollection: 0,
  growth: '+0%',
  weeklyTrends: [],
}

const getLocalDateString = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export default function Home() {
  const { language } = useSettingsStore()
  const navigate = useNavigate()
  const [data, setData] = useState<DashboardSummary | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [recentActivities, setRecentActivities] = useState<HomeActivityItem[]>([])
  const [todayMilkTotal, setTodayMilkTotal] = useState<number>(0)
  const summary = data ?? EMPTY_SUMMARY

  const today = getLocalDateString(new Date())

  useEffect(() => {
    const cached = getCachedViewData<DashboardSummary>(DASHBOARD_CACHE_KEY, DASHBOARD_CACHE_TTL_MS)
    if (cached) {
      setData(cached)
      void fetchDashboardSummary()
      void fetchRecentActivities()
      return
    }

    void fetchDashboardSummary()
    void fetchRecentActivities()
  }, [])

  const fetchDashboardSummary = async () => {
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
    }
  }

  const fetchRecentActivities = async () => {
    try {
      const [milkRes, attendanceRes, paymentsRes] = await Promise.all([
        axios.get('/api/milk-entries', { params: { date: today } }),
        axios.get('/api/labour/attendance', { params: { date: today } }),
        axios.get('/api/payments'),
      ])

      const nextActivities: HomeActivityItem[] = []

      const milkEntries = (milkRes.data?.data ?? []) as HomeMilkEntry[]
      const calculatedMilkTotal = milkEntries.reduce(
        (sum, entry) => sum + (entry.morningQuantity ?? 0) + (entry.eveningQuantity ?? 0),
        0
      )
      setTodayMilkTotal(calculatedMilkTotal)

      if (milkEntries.length > 0) {
        milkEntries.slice(0, 4).forEach((entry, index) => {
          const totalQty = (entry.morningQuantity ?? 0) + (entry.eveningQuantity ?? 0)
          nextActivities.push({
            id: `milk-${entry.id}-${index}`,
            title: language === 'mr' ? 'नवीन दूध नोंद' : 'Recent milk entry',
            detail: `${entry.customerName} - ${totalQty.toFixed(1)}L`,
            icon: Droplets,
            accent: 'bg-emerald-50 text-emerald-700',
            accentDark: 'dark:bg-emerald-500/10 dark:text-emerald-400',
          })
        })
      } else {
        setTodayMilkTotal(data?.totalMilkToday ?? 0)
      }

      const attendance = (attendanceRes.data?.data ?? []) as HomeAttendanceItem[]
      if (attendance.length > 0) {
        const presentCount = attendance.filter((item) => item.status === 'PRESENT').length
        nextActivities.push({
          id: 'attendance-today',
          title: language === 'mr' ? 'आजची कामगार हजेरी' : 'Today labour attendance',
          detail: language === 'mr'
            ? `${presentCount} कामगार हजर`
            : `${presentCount} workers marked present`,
          icon: Users,
          accent: 'bg-amber-50 text-amber-700',
          accentDark: 'dark:bg-amber-500/10 dark:text-amber-400',
        })
      }

      const payments = ((paymentsRes.data?.data ?? []) as HomePayment[]).sort((a, b) =>
        new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime()
      )
      if (payments.length > 0) {
        const latestPayment = payments[0]
        nextActivities.push({
          id: `payment-${latestPayment.id}`,
          title: language === 'mr' ? 'अलीकडील पेमेंट' : 'Recent payment',
          detail: language === 'mr'
            ? `${latestPayment.customerName} - ₹${latestPayment.amount}`
            : `${latestPayment.customerName} - ₹${latestPayment.amount}`,
          icon: IndianRupee,
          accent: 'bg-sky-50 text-sky-700',
          accentDark: 'dark:bg-sky-500/10 dark:text-sky-400',
        })
      }

      setRecentActivities(nextActivities.slice(0, 6))
    } catch (activityError) {
      console.error('Failed to load home activities', activityError)
      setRecentActivities([])
      setTodayMilkTotal(data?.totalMilkToday ?? 0)
    }
  }

  if (error || !data) {
    if (error) {
      return (
        <div className="w-full h-[60vh] flex flex-col items-center justify-center space-y-4">
          <div className="glass-card rounded-2xl p-6 max-w-md text-center dark:border-red-500/20">
            <h3 className="font-bold mb-2 text-red-600 dark:text-red-400">{t(language, 'connectionError')}</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">{error || t(language, 'couldNotLoadData')}</p>
            <p className="text-xs mt-4 text-slate-400 dark:text-slate-500">
              {t(language, 'currentApiUrl')}: {getApiBaseUrl()}
            </p>
          </div>
        </div>
      )
    }
  }

  return (
    <motion.div
      className="space-y-5 pt-1 sm:pt-0.5"
      initial="hidden"
      animate="visible"
      variants={dashboardStagger(0.08, 0.08)}
    >
      {/* Hero overview section */}
      <motion.section
        className="mobile-balance-card relative overflow-hidden rounded-[20px] bg-white p-5 shadow-[0_4px_24px_rgba(0,0,0,0.04)] transition-colors duration-500 sm:p-6 dark:bg-[#111111] dark:shadow-[0_4px_24px_rgba(0,0,0,0.3)]"
        variants={dashboardSection}
      >
        <motion.div className="relative space-y-5" variants={dashboardStagger(0.08, 0.05)}>
          <motion.div className="flex flex-wrap items-center gap-2" variants={fadeDown}>
            <span className="rounded-full bg-[#355E3B]/8 px-3 py-1 text-[10px] font-semibold tracking-[0.14em] text-[#355E3B] max-md:bg-white/20 max-md:text-white dark:bg-[#4CAF50]/15 dark:text-[#4CAF50]">
              {language === 'mr' ? 'डेअरी + कामगार' : 'Dairy + Labour'}
            </span>
            <span className="rounded-full bg-[#F5F5F5] px-3 py-1 text-[10px] font-semibold tracking-[0.14em] text-[#6B7280] max-md:bg-white/10 max-md:text-white/80 dark:bg-white/[0.05] dark:text-slate-400">
              {language === 'mr' ? 'एकाच मुख्य पानात' : 'One home view'}
            </span>
          </motion.div>

          <motion.div className="max-w-3xl" variants={fadeDown}>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 max-md:text-white dark:text-white sm:text-[1.85rem]">
              {language === 'mr'
                ? 'दूध नोंदी, ग्राहक आणि कामगार यांना जोडणारे एक सुंदर मुख्य पान'
                : 'A smart home page that connects dairy records, customers, and labour'}
            </h1>
            <p className="mt-2.5 max-w-2xl text-[13.5px] leading-relaxed text-slate-500 max-md:text-white/70 dark:text-slate-400">
              {language === 'mr'
                ? 'वरचा आढावा पाहा, खाली डेअरी आणि कामगार दोन्ही विभाग पटकन उघडा, आणि रोजच्या कामाचा सगळा प्रवास एकाच स्क्रीनवरून सांभाळा.'
                : "See today's overview, jump into Dairy or Labour instantly, and manage the full daily workflow from one screen."}
            </p>
          </motion.div>

          {/* Stats grid */}
          <motion.div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4" variants={dashboardStagger(0.12, 0.02)}>
            {[
              { label: t(language, 'totalMilkToday'), value: <AnimatedNumber value={todayMilkTotal || summary.totalMilkToday} precision={1} suffix="L" /> },
              { label: t(language, 'activeCustomers'), value: <AnimatedNumber value={summary.activeCustomers} /> },
              {
                label: language === 'mr' ? 'अलीकडील हालचाल' : 'Recent Activity',
                value:
                  recentActivities.length > 0
                    ? `${recentActivities.length} ${language === 'mr' ? 'नोंदी' : 'updates'}`
                    : (language === 'mr' ? 'अजून नाही' : 'No activity'),
              },
              { label: language === 'mr' ? 'कामाचा प्रवाह' : 'Work flow', value: language === 'mr' ? 'डेअरी + कामगार' : 'Dairy + Labour' },
            ].map((item) => (
              <motion.div
                key={item.label}
                variants={riseIn}
                whileHover={{ y: -2, transition: { duration: 0.2 } }}
                className="rounded-[14px] bg-[#F9F9F9] px-3.5 py-3 transition-all duration-300 max-md:bg-white/15 dark:bg-white/[0.04]"
              >
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400 max-md:text-white/60 dark:text-slate-500">{item.label}</p>
                <p className="mt-1.5 text-lg font-bold tracking-tight text-slate-900 max-md:text-white dark:text-white">
                  {typeof item.value === 'string' ? item.value : item.value}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </motion.section>

      {/* Mobile Quick Actions (Cash App style) */}
      <motion.div className="flex items-start justify-around px-2 md:hidden" variants={dashboardSection}>
        {[
          { icon: Droplets, label: language === 'mr' ? 'दूध नोंद' : 'Milk Entry', route: '/milk-entries' },
          { icon: Users, label: language === 'mr' ? 'ग्राहक' : 'Customers', route: '/customers' },
          { icon: CreditCard, label: language === 'mr' ? 'पेमेंट' : 'Payments', route: '/payments' },
          { icon: FileText, label: language === 'mr' ? 'रिपोर्ट' : 'Reports', route: '/reports' },
        ].map((action) => (
          <button
            key={action.route}
            type="button"
            onClick={() => navigate(action.route)}
            className="mobile-quick-action"
          >
            <span className="mobile-quick-action-icon">
              <action.icon className="h-5 w-5" />
            </span>
            <span className="text-[10px] font-medium text-slate-600 dark:text-slate-400">{action.label}</span>
          </button>
        ))}
      </motion.div>

      {/* Quick nav cards */}
      <div className="hidden gap-3 md:grid md:grid-cols-2">
        <motion.button
          type="button"
          onClick={() => navigate('/dairy')}
          variants={slideInLeft}
          whileHover={{ y: -3, transition: { duration: 0.2 } }}
          whileTap={{ scale: 0.98 }}
          className="group rounded-[20px] bg-white p-5 text-left shadow-[0_4px_24px_rgba(0,0,0,0.04)] transition-all duration-400 hover:shadow-[0_20px_60px_rgba(0,0,0,0.08)] dark:bg-[#111111] dark:shadow-[0_4px_24px_rgba(0,0,0,0.3)] dark:hover:shadow-[0_20px_60px_rgba(0,0,0,0.4)]"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <motion.span
                className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl shadow-[0_4px_12px_rgba(53,94,59,0.3)]"
                whileHover={{ scale: 1.05 }}
                transition={{ type: 'spring', stiffness: 220, damping: 18 }}
              >
                <Logo size={40} />
              </motion.span>
              <p className="mt-3.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-600 dark:text-emerald-400">
                {language === 'mr' ? 'डेअरी विभाग' : 'Dairy Section'}
              </p>
              <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                {language === 'mr' ? 'डेअरी' : 'Dairy'}
              </h2>
              <p className="mt-1.5 max-w-xs text-[13px] leading-relaxed text-slate-500 dark:text-slate-400">
                {language === 'mr'
                  ? 'ग्राहक, दूध नोंदी, बिलिंग आणि पेमेंट्स एका जागी उघडा.'
                  : 'Open customers, milk entries, billing, and payments in one place.'}
              </p>
            </div>
            <span className="rounded-full bg-slate-50 p-2 text-emerald-600 transition-transform duration-300 group-hover:translate-x-1 dark:bg-white/[0.05] dark:text-emerald-400">
              <ArrowRight className="h-4 w-4" />
            </span>
          </div>
        </motion.button>

        <motion.button
          type="button"
          onClick={() => navigate('/labour')}
          variants={slideInRight}
          whileHover={{ y: -3, transition: { duration: 0.2 } }}
          whileTap={{ scale: 0.98 }}
          className="group rounded-[20px] bg-white p-5 text-left shadow-[0_4px_24px_rgba(0,0,0,0.04)] transition-all duration-400 hover:shadow-[0_20px_60px_rgba(0,0,0,0.08)] dark:bg-[#111111] dark:shadow-[0_4px_24px_rgba(0,0,0,0.3)] dark:hover:shadow-[0_20px_60px_rgba(0,0,0,0.4)]"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <motion.span
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500 text-white shadow-[0_4px_12px_rgba(249,115,22,0.25)]"
                whileHover={{ scale: 1.05 }}
                transition={{ type: 'spring', stiffness: 220, damping: 18 }}
              >
                <BriefcaseBusiness className="h-5 w-5" />
              </motion.span>
              <p className="mt-3.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-orange-600 dark:text-orange-400">
                {language === 'mr' ? 'कामगार विभाग' : 'Labour Section'}
              </p>
              <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                {language === 'mr' ? 'कामगार' : 'Labour'}
              </h2>
              <p className="mt-1.5 max-w-xs text-[13px] leading-relaxed text-slate-500 dark:text-slate-400">
                {language === 'mr'
                  ? 'कामगार, हजेरी आणि वसुलीचे सगळे पर्याय पटकन उघडा.'
                  : 'Quickly open workers, attendance, and recoveries from here.'}
              </p>
            </div>
            <span className="rounded-full bg-slate-50 p-2 text-orange-600 transition-transform duration-300 group-hover:translate-x-1 dark:bg-white/[0.05] dark:text-orange-400">
              <ArrowRight className="h-4 w-4" />
            </span>
          </div>
        </motion.button>
      </div>

      {/* Recent activity */}
      <motion.section
        className="rounded-[20px] bg-white p-5 shadow-[0_4px_24px_rgba(0,0,0,0.04)] transition-colors duration-500 max-md:rounded-[20px] max-md:shadow-[0_2px_16px_rgba(0,0,0,0.06)] dark:bg-[#111111] dark:shadow-[0_4px_24px_rgba(0,0,0,0.3)]"
        variants={dashboardSection}
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
              {language === 'mr' ? 'अलीकडील हालचाल' : 'Recent activity'}
            </p>
            <h2 className="mt-1 text-lg font-bold tracking-tight text-slate-900 dark:text-white">
              {language === 'mr' ? 'आजच्या शेवटच्या नोंदी' : 'Latest updates from today'}
            </h2>
          </div>
          <span className="rounded-xl bg-slate-100/80 p-2.5 text-slate-400 dark:bg-white/[0.05] dark:text-slate-500">
            <Clock3 className="h-4 w-4" />
          </span>
        </div>

        <motion.div
          className="mt-4 space-y-2"
          initial="hidden"
          animate="visible"
          variants={dashboardStagger(0.07, 0.05)}
        >
          {recentActivities.length === 0 ? (
            <motion.div variants={riseIn} className="rounded-[14px] bg-[#F9F9F9] px-4 py-5 text-center text-[13px] text-[#9CA3AF] dark:bg-white/[0.03] dark:text-slate-500">
              {language === 'mr' ? 'अजून अलीकडील हालचाल नाही.' : 'No recent activity yet.'}
            </motion.div>
          ) : (
            recentActivities.map((activity) => (
              <motion.div
                key={activity.id}
                variants={riseIn}
                whileHover={{ x: 4, transition: { duration: 0.15 } }}
                className="flex items-center gap-3 rounded-[14px] bg-[#F9F9F9] px-4 py-3 transition-all duration-200 dark:bg-white/[0.04]"
              >
                <motion.span
                  className={`flex h-9 w-9 items-center justify-center rounded-[10px] ${activity.accent} ${activity.accentDark}`}
                  whileHover={{ scale: 1.05 }}
                  transition={{ type: 'spring', stiffness: 220, damping: 18 }}
                >
                  <activity.icon className="h-4 w-4" />
                </motion.span>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-slate-800 dark:text-white">{activity.title}</p>
                  <p className="text-[12.5px] text-slate-500 dark:text-slate-400">{activity.detail}</p>
                </div>
              </motion.div>
            ))
          )}
        </motion.div>
      </motion.section>
    </motion.div>
  )
}
