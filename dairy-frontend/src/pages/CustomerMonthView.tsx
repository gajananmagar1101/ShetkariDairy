import { useEffect, useMemo, useState, type ComponentType } from 'react'
import { ArrowLeft, CalendarDays, CheckCircle2, Coins, CreditCard, FileText } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'
import { useSettingsStore } from '../store/settingsStore'
import { getDisplayLocale } from '../utils/numberFormat'
import { Button } from '../components/ui/button'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { LoadingBlock } from '../components/ui/loading'
import { fetchCustomersWithCache } from '../lib/customerCache'

interface Customer {
  id: string
  name: string
  phone?: string
  balance?: number
  active?: boolean
  milkType?: string
  ratePerLiter?: number
  dailyQuantity?: number
  skippedDates?: string[]
}

interface MilkEntry {
  id: string
  date: string
  morningQuantity?: number
  eveningQuantity?: number
  totalAmount?: number
}

interface Invoice {
  id: string
  customerId?: string
  periodStartDate: string
  periodEndDate: string
  totalAmount: number
  paidAmount: number
  status: string
}

interface Payment {
  id: string
  customerId?: string
  amount: number
  paymentDate: string
  paidFromDate?: string | null
  paidToDate?: string | null
  status: string
}

const formatLocalDate = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const getMonthBounds = (year: number, monthIndex: number) => {
  const start = new Date(year, monthIndex, 1)
  const end = new Date(year, monthIndex + 1, 0)
  return {
    startDate: formatLocalDate(start),
    endDate: formatLocalDate(end),
  }
}

export default function CustomerMonthView() {
  const { language } = useSettingsStore()
  const navigate = useNavigate()
  const params = useParams()
  const customerId = params.customerId ?? ''
  const year = Number(params.year)
  const month = Number(params.month)
  const monthIndex = month - 1
  const bounds = useMemo(() => getMonthBounds(year, monthIndex), [year, monthIndex])

  const [customer, setCustomer] = useState<Customer | null>(null)
  const [entries, setEntries] = useState<MilkEntry[]>([])
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [payments, setPayments] = useState<Payment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isPaying, setIsPaying] = useState(false)
  const [isPayDialogOpen, setIsPayDialogOpen] = useState(false)
  const [payAmountInput, setPayAmountInput] = useState('')

  const monthLabel = useMemo(
    () => new Intl.DateTimeFormat(getDisplayLocale(language), { month: 'long', year: 'numeric' }).format(new Date(year, monthIndex, 1)),
    [language, year, monthIndex],
  )

  const loadData = async () => {
    if (!customerId || Number.isNaN(year) || Number.isNaN(monthIndex)) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    try {
      const [customers, entriesRes, invoicesRes, paymentsRes] = await Promise.all([
        fetchCustomersWithCache<Customer>(),
        axios.get('/api/milk-entries/customer-range', {
          params: {
            customerId,
            startDate: bounds.startDate,
            endDate: bounds.endDate,
          },
        }),
        axios.get(`/api/invoices/customer/${customerId}`),
        axios.get(`/api/payments/customer/${customerId}`),
      ])

      const foundCustomer = customers.find((item) => item.id === customerId) ?? null
      setCustomer(foundCustomer)

      if (entriesRes.data?.success) {
        const sortedEntries = [...(entriesRes.data.data ?? [])].sort((a: MilkEntry, b: MilkEntry) => new Date(a.date).getTime() - new Date(b.date).getTime())
        setEntries(sortedEntries)
      }

      if (invoicesRes.data?.success) {
        const monthInvoices: Invoice[] = (invoicesRes.data.data ?? []).filter((item: Invoice) => {
          const startDate = item.periodStartDate ? new Date(item.periodStartDate) : null
          const endDate = item.periodEndDate ? new Date(item.periodEndDate) : null
          if (!startDate || Number.isNaN(startDate.getTime())) return false
          if (!endDate || Number.isNaN(endDate.getTime())) return false
          const startsInMonth = startDate.getFullYear() === year && startDate.getMonth() === monthIndex
          const endsInMonth = endDate.getFullYear() === year && endDate.getMonth() === monthIndex
          return startsInMonth && endsInMonth
        })

        const preferred = monthInvoices.reduce<Invoice | null>((current, candidate) => {
          if (!current) return candidate
          if (current.status !== candidate.status) {
            return current.status === 'PAID' ? current : candidate
          }
          const currentAmount = Number(current.totalAmount || 0)
          const candidateAmount = Number(candidate.totalAmount || 0)
          if (candidateAmount !== currentAmount) {
            return candidateAmount > currentAmount ? candidate : current
          }
          return new Date(candidate.periodStartDate).getTime() > new Date(current.periodStartDate).getTime()
            ? candidate
            : current
        }, null)

        setInvoice(preferred)
      }

      if (paymentsRes.data?.success) {
        const monthPayments = (paymentsRes.data.data ?? []).filter((item: Payment) => {
          const paymentDate = item.paymentDate ? new Date(item.paymentDate) : null
          if (paymentDate && !Number.isNaN(paymentDate.getTime())) {
            return paymentDate.getFullYear() === year && paymentDate.getMonth() === monthIndex
          }
          return false
        })
        setPayments(monthPayments)
      }
    } catch (error) {
      console.error(error)
      toast.error(language === 'mr' ? 'महिन्याचा तपशील लोड झाला नाही.' : 'Failed to load month details.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [customerId, year, monthIndex])

  const { deliveredDays, totalLiters, totalAmount } = useMemo(() => {
    const byDate = new Map<string, { qty: number; amount: number }>()
    for (const entry of entries) {
      const dateKey = entry.date?.slice(0, 10) ?? ''
      const qty = (entry.morningQuantity ?? 0) + (entry.eveningQuantity ?? 0)
      const amt = Number(entry.totalAmount || 0)
      const existing = byDate.get(dateKey)
      if (existing) {
        existing.qty += qty
        existing.amount += amt
      } else {
        byDate.set(dateKey, { qty, amount: amt })
      }
    }
    let days = 0, liters = 0, amount = 0
    for (const v of byDate.values()) {
      if (v.qty > 0) days++
      liters += v.qty
      amount += v.amount
    }
    return { deliveredDays: days, totalLiters: liters, totalAmount: amount }
  }, [entries])
  const paidAmount = invoice?.paidAmount != null
    ? Number(invoice.paidAmount || 0)
    : payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0)
  const balance = Math.max(0, Number(invoice?.totalAmount || totalAmount) - paidAmount)
  const monthBillAmount = Number(invoice?.totalAmount || totalAmount)
  const monthMetricLabel = balance <= 0
    ? (language === 'mr' ? 'महिन्याची रक्कम' : 'Month amount')
    : (language === 'mr' ? 'महिन्याचा शिल्लक' : 'Month due')
  const monthMetricValue = balance <= 0 ? monthBillAmount : balance
  const canPay = balance > 0 && invoice?.status !== 'PAID'
  const timelineItems = useMemo(() => {
    const entryByDate = new Map<string, MilkEntry>()
    entries.forEach((entry) => {
      if (entry.date) {
        const key = entry.date.slice(0, 10)
        const existing = entryByDate.get(key)
        if (existing) {
          entryByDate.set(key, {
            ...existing,
            morningQuantity: (existing.morningQuantity ?? 0) + (entry.morningQuantity ?? 0),
            eveningQuantity: (existing.eveningQuantity ?? 0) + (entry.eveningQuantity ?? 0),
            totalAmount: Number(existing.totalAmount || 0) + Number(entry.totalAmount || 0),
          })
        } else {
          entryByDate.set(key, entry)
        }
      }
    })

    const skipDateSet = new Set(
      (customer?.skippedDates ?? [])
        .map((date) => date.slice(0, 10))
        .filter((date) => date >= bounds.startDate && date <= bounds.endDate)
    )

    const allDates = new Set<string>([
      ...Array.from(entryByDate.keys()),
      ...Array.from(skipDateSet),
    ])

    return Array.from(allDates)
      .sort((a, b) => a.localeCompare(b))
      .map((date) => ({
        date,
        type: entryByDate.has(date) ? ('entry' as const) : ('holiday' as const),
        entry: entryByDate.get(date) ?? null,
      }))
  }, [bounds.endDate, bounds.startDate, customer?.skippedDates, entries])

  const handlePay = async () => {
    if (!customer || isPaying) return

    const requestedAmount = Number(payAmountInput || balance || 0)
    if (!Number.isFinite(requestedAmount) || requestedAmount <= 0) {
      toast.error(language === 'mr' ? 'कृपया योग्य रक्कम भरा.' : 'Please enter a valid amount.')
      return
    }
    if (requestedAmount > balance) {
      toast.error(language === 'mr' ? 'बाकी रकमेपेक्षा जास्त भरणे शक्य नाही.' : 'Amount cannot exceed the remaining due.')
      return
    }

    setIsPaying(true)
    try {
      let invoiceId = invoice?.id

      if (!invoiceId) {
        const res = await axios.post('/api/invoices/generate', null, {
          params: {
            customerId,
            startDate: bounds.startDate,
            endDate: bounds.endDate,
          },
        })

        if (!res.data?.success || !res.data?.data?.id) {
          throw new Error('Failed to generate invoice')
        }

        invoiceId = res.data.data.id
      }

      const payRes = await axios.put(`/api/invoices/${invoiceId}/pay`, null, {
        params: {
          amount: requestedAmount,
        },
      })
      if (!payRes.data?.success) {
        throw new Error('Failed to pay invoice')
      }

      toast.success(language === 'mr' ? 'महिन्याचे बिल भरले.' : 'Month bill paid.')
      await loadData()
      setIsPayDialogOpen(false)
      setPayAmountInput('')
    } catch (error) {
      console.error(error)
      toast.error(language === 'mr' ? 'पेमेंट झाले नाही.' : 'Could not complete payment.')
    } finally {
      setIsPaying(false)
    }
  }

  if (isLoading) {
    return <LoadingBlock label={language === 'mr' ? 'महिन्याचा तपशील लोड होत आहे...' : 'Loading month details...'} minHeightClassName="min-h-[60vh]" />
  }

  if (!customer) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm text-slate-500">{language === 'mr' ? 'ग्राहक सापडला नाही.' : 'Customer not found.'}</p>
      </div>
    )
  }

  return (
    <>
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => navigate('/customers', { state: { openCustomerId: customerId } })}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-slate-100 dark:border-slate-700 dark:bg-[#111111] dark:text-white dark:hover:bg-slate-800"
        >
          <ArrowLeft className="h-4 w-4" />
          {language === 'mr' ? 'मागे' : 'Back'}
        </button>
        {canPay ? (
          <Button
            type="button"
            onClick={() => {
              setPayAmountInput(String(balance))
              setIsPayDialogOpen(true)
            }}
            className="rounded-xl px-4 py-2 text-sm font-semibold"
            disabled={isPaying}
          >
            {language === 'mr' ? 'Pay करा' : 'Pay'}
          </Button>
        ) : (
          <span className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-500 shadow-sm dark:border-slate-700 dark:bg-[#111111] dark:text-slate-300">
            <CheckCircle2 className="h-4 w-4" />
            {language === 'mr' ? 'पूर्ण भरले' : 'Paid'}
          </span>
        )}
      </div>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#111111]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-slate-500">{customer.name}</p>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">{monthLabel}</h1>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-right dark:border-slate-700 dark:bg-slate-900">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">{monthMetricLabel}</p>
            <p className="text-2xl font-extrabold text-slate-900 dark:text-white">₹{monthMetricValue}</p>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MetricCard icon={CalendarDays} label={language === 'mr' ? 'दिवस' : 'Days'} value={`${deliveredDays}`} />
          <MetricCard icon={Coins} label={language === 'mr' ? 'लिटर' : 'Liters'} value={`${totalLiters.toFixed(1)} L`} />
          <MetricCard icon={FileText} label={language === 'mr' ? 'बिल' : 'Bill'} value={`₹${Number(invoice?.totalAmount || totalAmount).toFixed(0)}`} />
          <MetricCard icon={CreditCard} label={language === 'mr' ? 'भरले' : 'Paid'} value={`₹${Number(paidAmount).toFixed(0)}`} />
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#111111]">
          <h2 className="mb-4 text-lg font-bold text-slate-900 dark:text-white">{language === 'mr' ? 'दूध नोंदी' : 'Milk entries'}</h2>
          <div className="space-y-3">
            {timelineItems.length === 0 ? (
              <p className="text-sm text-slate-500">{language === 'mr' ? 'या महिन्यासाठी नोंदी किंवा दूध बंद दिवस नाहीत.' : 'No entries or milk-off days for this month.'}</p>
            ) : (
              timelineItems.map((item) => (
                <div key={item.date} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white">
                        {new Intl.DateTimeFormat(getDisplayLocale(language), { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(item.date))}
                      </p>
                      {item.type === 'holiday' ? (
                        <p className="mt-1 inline-flex rounded-md bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
                          {language === 'mr' ? 'दूध बंद' : 'Milk Off'}
                        </p>
                      ) : (
                        <p className="text-sm text-slate-500">
                          {language === 'mr'
                            ? `सकाळ: ${item.entry?.morningQuantity ?? 0} L • संध्याकाळ: ${item.entry?.eveningQuantity ?? 0} L`
                            : `Morning: ${item.entry?.morningQuantity ?? 0} L • Evening: ${item.entry?.eveningQuantity ?? 0} L`}
                        </p>
                      )}
                    </div>
                    <p className="text-base font-bold text-slate-900 dark:text-white">
                      {item.type === 'holiday' ? '₹0' : `₹${Number(item.entry?.totalAmount || 0).toFixed(0)}`}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#111111]">
            <h2 className="mb-4 text-lg font-bold text-slate-900 dark:text-white">{language === 'mr' ? 'बिल माहिती' : 'Invoice details'}</h2>
            {invoice ? (
              <div className="space-y-2 text-sm text-slate-700 dark:text-slate-200">
                <p>{language === 'mr' ? 'कालावधी' : 'Period'}: {invoice.periodStartDate?.split('-').reverse().join('/')} - {invoice.periodEndDate?.split('-').reverse().join('/')}</p>
                <p>{language === 'mr' ? 'स्टेटस' : 'Status'}: {invoice.status}</p>
                <p>{language === 'mr' ? 'एकूण बिल' : 'Total bill'}: ₹{Number(invoice.totalAmount || 0).toFixed(0)}</p>
                <p>{language === 'mr' ? 'भरले' : 'Paid'}: ₹{Number(invoice.paidAmount || 0).toFixed(0)}</p>
              </div>
            ) : (
              <p className="text-sm text-slate-500">{language === 'mr' ? 'या महिन्यासाठी invoice नाही.' : 'No invoice for this month yet.'}</p>
            )}
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#111111]">
            <h2 className="mb-4 text-lg font-bold text-slate-900 dark:text-white">{language === 'mr' ? 'पेमेंट्स' : 'Payments'}</h2>
            <div className="space-y-3">
              {payments.length === 0 ? (
                <p className="text-sm text-slate-500">{language === 'mr' ? 'या महिन्यात पेमेंट नाही.' : 'No payments in this month.'}</p>
              ) : (
                payments.map((payment) => (
                  <div key={payment.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                        {new Intl.DateTimeFormat(getDisplayLocale(language), { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(payment.paymentDate))}
                      </p>
                      <p className="font-bold text-slate-900 dark:text-white">₹{Number(payment.amount || 0).toFixed(0)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </section>
    </div>

      <ConfirmDialog
        isOpen={isPayDialogOpen}
        onClose={() => {
          setIsPayDialogOpen(false)
          setPayAmountInput('')
        }}
        onConfirm={handlePay}
        isProcessing={isPaying}
        title={language === 'mr' ? 'भरण्याची रक्कम' : 'Payment amount'}
        description={language === 'mr'
          ? `एकूण ₹${monthBillAmount} • भरले ₹${paidAmount} • बाकी ₹${balance}`
          : `Total ₹${monthBillAmount} • Paid ₹${paidAmount} • Due ₹${balance}`}
        confirmText={language === 'mr' ? 'Pay करा' : 'Pay'}
        cancelText={language === 'mr' ? 'रद्द' : 'Cancel'}
        isDestructive={false}
      >
        <div className="space-y-3">
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
            {language === 'mr' ? 'भरण्याची रक्कम' : 'Amount to pay'}
          </label>
          <input
            type="number"
            min="1"
            max={String(balance)}
            step="0.01"
            value={payAmountInput}
            onChange={(event) => {
              const nextValue = event.target.value
              if (nextValue === '') {
                setPayAmountInput('')
                return
              }
              const nextAmount = Number(nextValue)
              if (Number.isFinite(nextAmount) && nextAmount <= balance) {
                setPayAmountInput(nextValue)
              }
            }}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-500 dark:border-slate-700 dark:bg-[#111111] dark:text-white dark:focus:ring-white/30"
            placeholder={String(balance)}
          />
        </div>
      </ConfirmDialog>
    </>
  )
}

function MetricCard({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ className?: string }>
  label: string
  value: string
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-slate-500" />
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">{label}</p>
      </div>
      <p className="mt-2 text-base font-bold text-slate-900 dark:text-white">{value}</p>
    </div>
  )
}
