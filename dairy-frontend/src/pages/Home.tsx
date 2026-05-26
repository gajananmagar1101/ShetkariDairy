import { useState, useEffect } from 'react'
import { ArrowRight, BriefcaseBusiness, Clock3, Droplets, IndianRupee, Sprout, Users } from 'lucide-react'
import axios from 'axios'
import { getApiBaseUrl } from '../lib/api'
import { useSettingsStore } from '../store/settingsStore'
import { t } from '../utils/translations'
import { LoadingBlock } from '../components/ui/loading'
import { getCachedViewData, setCachedViewData } from '../lib/viewCache'
import { useNavigate } from 'react-router-dom'

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
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [recentActivities, setRecentActivities] = useState<HomeActivityItem[]>([])
  const [todayMilkTotal, setTodayMilkTotal] = useState<number>(0)

  const today = getLocalDateString(new Date())

  useEffect(() => {
    const cached = getCachedViewData<DashboardSummary>(DASHBOARD_CACHE_KEY, DASHBOARD_CACHE_TTL_MS)
    if (cached) {
      setData(cached)
      setIsLoading(false)
      void fetchDashboardSummary(false)
      void fetchRecentActivities()
      return
    }

    void fetchDashboardSummary(true)
    void fetchRecentActivities()
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
        })
      }

      setRecentActivities(nextActivities.slice(0, 6))
    } catch (activityError) {
      console.error('Failed to load home activities', activityError)
      setRecentActivities([])
      setTodayMilkTotal(data?.totalMilkToday ?? 0)
    }
  }

  if (isLoading) {
    return <LoadingBlock label={t(language, 'loadingDashboard')} minHeightClassName="min-h-[60vh]" />
  }

  if (error || !data) {
    return (
      <div className="w-full h-[60vh] flex flex-col items-center justify-center space-y-4">
        <div className="bg-red-50 text-red-500 p-4 rounded-xl border border-red-100 max-w-md text-center">
          <h3 className="font-bold mb-2">{t(language, 'connectionError')}</h3>
          <p className="text-sm">{error || t(language, 'couldNotLoadData')}</p>
          <p className="text-xs mt-4 text-red-400">
            {t(language, 'currentApiUrl')}: {getApiBaseUrl()}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 pt-2 sm:pt-1">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.96),_rgba(236,253,245,0.88)_30%,_rgba(255,247,237,0.72)_64%,_rgba(224,231,255,0.84)_100%)] p-5 shadow-[0_24px_60px_-36px_rgba(15,23,42,0.5)] sm:p-7">
        <div className="absolute right-[-3rem] top-[-3rem] h-32 w-32 rounded-full bg-emerald-200/40 blur-3xl" />
        <div className="absolute bottom-[-4rem] left-[-3rem] h-36 w-36 rounded-full bg-orange-200/40 blur-3xl" />

        <div className="relative space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-white/80 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.24em] text-emerald-700 shadow-sm">
              {language === 'mr' ? 'डेअरी + कामगार' : 'Dairy + Labour'}
            </span>
            <span className="rounded-full bg-slate-900 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.24em] text-white shadow-sm">
              {language === 'mr' ? 'एकाच मुख्य पानात' : 'One home view'}
            </span>
          </div>

          <div className="max-w-3xl">
            <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
              {language === 'mr'
                ? 'दूध नोंदी, ग्राहक आणि कामगार यांना जोडणारे एक सुंदर मुख्य पान'
                : 'A smart home page that connects dairy records, customers, and labour'}
            </h1>
            <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-slate-600 sm:text-base">
              {language === 'mr'
                ? 'वरचा आढावा पाहा, खाली डेअरी आणि कामगार दोन्ही विभाग पटकन उघडा, आणि रोजच्या कामाचा सगळा प्रवास एकाच स्क्रीनवरून सांभाळा.'
                : 'See today’s overview, jump into Dairy or Labour instantly, and manage the full daily workflow from one screen.'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
              { label: t(language, 'totalMilkToday'), value: `${todayMilkTotal.toFixed(1)} L` },
              { label: t(language, 'activeCustomers'), value: data.activeCustomers.toString() },
              {
                label: language === 'mr' ? 'अलीकडील हालचाल' : 'Recent Activity',
                value:
                  recentActivities.length > 0
                    ? `${recentActivities.length} ${language === 'mr' ? 'नोंदी' : 'updates'}`
                    :
                  (language === 'mr' ? 'अजून नाही' : 'No activity'),
              },
              { label: language === 'mr' ? 'कामाचा प्रवाह' : 'Work flow', value: language === 'mr' ? 'डेअरी + कामगार' : 'Dairy + Labour' },
            ].map((item) => (
              <div key={item.label} className="rounded-[1.4rem] border border-white/80 bg-white/75 px-4 py-3 shadow-[0_14px_36px_-28px_rgba(15,23,42,0.4)] backdrop-blur">
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">{item.label}</p>
                <p className="mt-2 text-lg font-black tracking-tight text-slate-900 sm:text-xl">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <button
          type="button"
          onClick={() => navigate('/dairy')}
          className="group rounded-[1.8rem] border border-emerald-100 bg-[radial-gradient(circle_at_top_left,_rgba(236,253,245,0.95),_rgba(255,255,255,0.95)_55%,_rgba(220,252,231,0.9)_100%)] p-5 text-left shadow-[0_18px_40px_-30px_rgba(16,185,129,0.55)] transition-all hover:-translate-y-0.5"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="flex h-12 w-12 items-center justify-center rounded-[1rem] bg-emerald-500 text-white shadow-[0_14px_28px_-18px_rgba(16,185,129,0.95)]">
                <Sprout className="h-6 w-6" />
              </span>
              <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.22em] text-emerald-700">
                {language === 'mr' ? 'डेअरी विभाग' : 'Dairy Section'}
              </p>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900">
                {language === 'mr' ? 'डेअरी' : 'Dairy'}
              </h2>
              <p className="mt-2 max-w-xs text-sm font-medium leading-6 text-slate-600">
                {language === 'mr'
                  ? 'ग्राहक, दूध नोंदी, बिलिंग आणि पेमेंट्स एका जागी उघडा.'
                  : 'Open customers, milk entries, billing, and payments in one place.'}
              </p>
            </div>
            <span className="rounded-full bg-white/90 p-2 text-emerald-600 shadow-sm transition-transform group-hover:translate-x-1">
              <ArrowRight className="h-5 w-5" />
            </span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => navigate('/labour')}
          className="group rounded-[1.8rem] border border-amber-100 bg-[radial-gradient(circle_at_top_left,_rgba(255,247,237,0.96),_rgba(255,255,255,0.95)_55%,_rgba(245,243,255,0.88)_100%)] p-5 text-left shadow-[0_18px_40px_-30px_rgba(249,115,22,0.45)] transition-all hover:-translate-y-0.5"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="flex h-12 w-12 items-center justify-center rounded-[1rem] bg-orange-500 text-white shadow-[0_14px_28px_-18px_rgba(249,115,22,0.95)]">
                <BriefcaseBusiness className="h-6 w-6" />
              </span>
              <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.22em] text-orange-700">
                {language === 'mr' ? 'कामगार विभाग' : 'Labour Section'}
              </p>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900">
                {language === 'mr' ? 'कामगार' : 'Labour'}
              </h2>
              <p className="mt-2 max-w-xs text-sm font-medium leading-6 text-slate-600">
                {language === 'mr'
                  ? 'कामगार, हजेरी आणि वसुलीचे सगळे पर्याय पटकन उघडा.'
                  : 'Quickly open workers, attendance, and recoveries from here.'}
              </p>
            </div>
            <span className="rounded-full bg-white/90 p-2 text-orange-600 shadow-sm transition-transform group-hover:translate-x-1">
              <ArrowRight className="h-5 w-5" />
            </span>
          </div>
        </button>
      </div>

      <section className="rounded-[1.8rem] border border-white/70 bg-white/70 p-5 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.35)] backdrop-blur-xl">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">
              {language === 'mr' ? 'अलीकडील हालचाल' : 'Recent activity'}
            </p>
            <h2 className="mt-2 text-xl font-black tracking-tight text-slate-900">
              {language === 'mr' ? 'आजच्या शेवटच्या नोंदी' : 'Latest updates from today'}
            </h2>
          </div>
          <span className="rounded-full bg-slate-100 p-2 text-slate-500">
            <Clock3 className="h-4 w-4" />
          </span>
        </div>

        <div className="mt-5 space-y-3">
          {recentActivities.length === 0 ? (
            <div className="rounded-[1.2rem] border border-dashed border-slate-200 bg-slate-50/80 px-4 py-5 text-sm font-medium text-slate-500">
              {language === 'mr' ? 'अजून अलीकडील हालचाल नाही.' : 'No recent activity yet.'}
            </div>
          ) : (
            recentActivities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-center gap-3 rounded-[1.2rem] border border-white/80 bg-white/85 px-4 py-3 shadow-[0_12px_28px_-26px_rgba(15,23,42,0.35)]"
              >
                <span className={`flex h-11 w-11 items-center justify-center rounded-[1rem] ${activity.accent}`}>
                  <activity.icon className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900">{activity.title}</p>
                  <p className="text-sm text-slate-500">{activity.detail}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  )
}
