import { useState, useEffect } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import axios from 'axios'
import { Loader2, TrendingUp, TrendingDown, IndianRupee } from 'lucide-react'
import { useSettingsStore } from '../store/settingsStore'
import { t } from '../utils/translations'

interface DailySummary {
  date: string
  revenue: number
  expenses: number
  profit: number
}

export default function Reports() {
  const { language } = useSettingsStore()
  const [data, setData] = useState<DailySummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [year, setYear] = useState(new Date().getFullYear())
  const [month, setMonth] = useState(new Date().getMonth() + 1)

  useEffect(() => {
    fetchReport()
  }, [year, month])

  const fetchReport = async () => {
    setIsLoading(true)
    try {
      const res = await axios.get(`/api/reports/monthly?year=${year}&month=${month}`)
      if (res.data.success) {
        // Format date string for chart (e.g. "2024-05-01" -> "01 May")
        const formattedData = res.data.data.map((d: any) => ({
          ...d,
          dayLabel: new Date(d.date).toLocaleDateString('default', { day: '2-digit', month: 'short' })
        }))
        setData(formattedData)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const totalRevenue = data.reduce((acc, curr) => acc + curr.revenue, 0)
  const totalExpenses = data.reduce((acc, curr) => acc + curr.expenses, 0)
  const totalProfit = data.reduce((acc, curr) => acc + curr.profit, 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-800 dark:text-white">{t(language, 'reportsTitle')}</h1>
          <p className="text-slate-500 dark:text-slate-300 font-medium mt-1">{t(language, 'reportsDesc')}</p>
        </div>

        <div className="flex gap-3">
          <select 
            value={month}
            onChange={e => setMonth(parseInt(e.target.value))}
            className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white/60 dark:bg-slate-900/60 dark:text-white shadow-sm"
          >
            {[...Array(12)].map((_, i) => (
              <option key={i+1} value={i+1}>{new Date(0, i).toLocaleString('default', { month: 'long' })}</option>
            ))}
          </select>
          <input 
            type="number" value={year}
            onChange={e => setYear(parseInt(e.target.value))}
            className="w-24 px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white/60 dark:bg-slate-900/60 dark:text-white shadow-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md rounded-3xl border border-white/60 dark:border-slate-700 shadow-sm p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <IndianRupee className="w-6 h-6" />
          </div>
          <div>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">{t(language, 'totalMilkSales')}</p>
            <h3 className="text-2xl font-bold text-slate-800 dark:text-white">₹{totalRevenue.toFixed(2)}</h3>
          </div>
        </div>

        <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md rounded-3xl border border-white/60 dark:border-slate-700 shadow-sm p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-900/50 flex items-center justify-center text-red-600 dark:text-red-400">
            <TrendingDown className="w-6 h-6" />
          </div>
          <div>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">{t(language, 'totalExpenses')}</p>
            <h3 className="text-2xl font-bold text-slate-800 dark:text-white">₹{totalExpenses.toFixed(2)}</h3>
          </div>
        </div>

        <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md rounded-3xl border border-white/60 dark:border-slate-700 shadow-sm p-6 flex items-center gap-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${totalProfit >= 0 ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400' : 'bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400'}`}>
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">{t(language, 'netProfitLoss')}</p>
            <h3 className={`text-2xl font-bold ${totalProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              ₹{totalProfit.toFixed(2)}
            </h3>
          </div>
        </div>
      </div>

      <div className="bg-white/40 dark:bg-slate-900/60 backdrop-blur-xl rounded-[2rem] border border-white/60 dark:border-slate-700/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-4 sm:p-8">
        <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-6">{t(language, 'monthlyProfitTrend')}</h3>
        <div className="h-[400px] w-full">
          {isLoading ? (
            <div className="w-full h-full flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="dayLabel" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `₹${value}`} />
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: any) => [`₹${Number(value).toFixed(2)}`, undefined]}
                />
                <Area type="monotone" dataKey="revenue" name="Sales" stroke="#3b82f6" fillOpacity={0} strokeWidth={2} />
                <Area type="monotone" dataKey="expenses" name="Expenses" stroke="#ef4444" fillOpacity={1} fill="url(#colorExpense)" strokeWidth={2} />
                <Area type="monotone" dataKey="profit" name="Profit" stroke="#10b981" fillOpacity={1} fill="url(#colorProfit)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  )
}
