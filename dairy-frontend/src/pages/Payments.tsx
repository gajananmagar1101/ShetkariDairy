import { useState, useEffect } from 'react'
import axios from 'axios'
import { useSettingsStore } from '../store/settingsStore'
import { t } from '../utils/translations'
import { LoadingBlock } from '../components/ui/loading'
import { getCachedViewData, setCachedViewData } from '../lib/viewCache'

interface Payment {
  id: string
  customerId: string
  customerName: string
  amount: number
  paymentDate: string
  paidFromDate?: string
  paidToDate?: string
  paymentMethod: string
  status: string
}

const PAYMENTS_CACHE_KEY = 'view-cache-payments'
const PAYMENTS_CACHE_TTL_MS = 60_000

export default function Payments() {
  const { language } = useSettingsStore()
  const [payments, setPayments] = useState<Payment[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const cachedPayments = getCachedViewData<Payment[]>(PAYMENTS_CACHE_KEY, PAYMENTS_CACHE_TTL_MS)
    if (cachedPayments) {
      setPayments(cachedPayments)
      setIsLoading(false)
      void fetchPayments()
      return
    }

    void loadInitialData()
  }, [])

  const loadInitialData = async () => {
    setIsLoading(true)
    try {
      await fetchPayments()
    } finally {
      setIsLoading(false)
    }
  }

  const fetchPayments = async () => {
    try {
      const res = await axios.get('/api/payments')
      if (res.data.success) {
        const sortedPayments = [...res.data.data].sort((a: Payment, b: Payment) => {
          const dateDiff = new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime()
          return dateDiff !== 0 ? dateDiff : b.id.localeCompare(a.id)
        })
        setPayments(sortedPayments)
        setCachedViewData(PAYMENTS_CACHE_KEY, sortedPayments)
      }
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-800 dark:text-white">{t(language, 'paymentsTitle')}</h1>
          <p className="text-slate-500 dark:text-slate-300 font-medium mt-1">{t(language, 'paymentsDesc')}</p>
        </div>
      </div>

      <div className="bg-white/40 dark:bg-slate-900/60 backdrop-blur-xl rounded-[2rem] border border-white/60 dark:border-slate-700/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-4 sm:p-8">
        <div className="overflow-x-auto">
          {isLoading ? (
            <LoadingBlock label={t(language, 'loadingPayments')} minHeightClassName="min-h-[220px]" size="md" />
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200/60 dark:border-slate-600 text-slate-500 dark:text-slate-300 text-sm">
                  <th className="pb-3 px-4 font-medium whitespace-nowrap">{t(language, 'customer')}</th>
                  <th className="pb-3 px-4 font-medium whitespace-nowrap">{t(language, 'date')}</th>
                  <th className="pb-3 px-4 font-medium whitespace-nowrap">{t(language, 'status')}</th>
                  <th className="pb-3 px-4 font-medium text-right whitespace-nowrap">{t(language, 'amountRs')}</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-500 dark:text-slate-300">{t(language, 'noPayments')}</td>
                  </tr>
                ) : (
                  payments.map((payment) => (
                    <tr key={payment.id} className="border-b border-slate-100 dark:border-slate-800/50 last:border-0 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-4 px-4 whitespace-nowrap">
                        <span className="font-medium text-slate-800 dark:text-slate-200">{payment.customerName}</span>
                        {payment.paidFromDate && payment.paidToDate ? (
                          <p className="mt-1 text-xs text-slate-500">
                            {payment.paidFromDate} - {payment.paidToDate}
                          </p>
                        ) : null}
                      </td>
                      <td className="py-4 px-4 text-slate-600 dark:text-slate-300 whitespace-nowrap">{payment.paymentDate}</td>
                      <td className="py-4 px-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                          payment.status === 'PAID' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {payment.status === 'PAID' ? t(language, 'paid') : t(language, 'completed')}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">+₹{payment.amount}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
