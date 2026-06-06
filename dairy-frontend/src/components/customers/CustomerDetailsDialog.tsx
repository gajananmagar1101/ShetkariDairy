import { Fragment, useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { LoadingBlock } from '../ui/loading'
import { useSettingsStore } from '../../store/settingsStore'
import { t } from '../../utils/translations'
import { getDisplayLocale } from '../../utils/numberFormat'
import { invalidateCustomerCache } from '../../lib/customerCache'
import { invalidateViewCache } from '../../lib/viewCache'

interface Customer {
  id: string
  name: string
  phone: string
  address: string
  balance: number
  milkType: string
  ratePerLiter: number
  dailyQuantity: number
  skippedDates?: string[]
  active: boolean
}

interface MilkEntry {
  id: string
  date: string
  morningQuantity: number
  eveningQuantity: number
  totalAmount: number
  isVirtualSkipped?: boolean
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
  amount: number
  paymentDate: string
  paidFromDate?: string | null
  paidToDate?: string | null
  status: string
}

interface MonthlyFinancialGroup {
  key: string
  label: string
  year: number
  monthIndex: number
  billed: number
  paid: number
  balance: number
  displayBalance: number
  hasInvoice: boolean
  invoiceId?: string
  invoiceStatus?: string
  periodStartDate: string
  periodEndDate: string
}

interface MonthlyEntryRow {
  date: string
  type: 'entry' | 'holiday'
  entry: MilkEntry | null
}

interface CustomerDetailsDialogProps {
  customer: Customer | null
  isOpen: boolean
  onClose: () => void
  onCustomerUpdated?: () => void
}

export function CustomerDetailsDialog({ customer, isOpen, onClose, onCustomerUpdated }: CustomerDetailsDialogProps) {
  const { language } = useSettingsStore()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'info' | 'entries' | 'holidays' | 'invoices' | 'payments'>('info')
  const [entries, setEntries] = useState<MilkEntry[]>([])
  const [allEntries, setAllEntries] = useState<MilkEntry[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [hasLoadedDetails, setHasLoadedDetails] = useState(false)
  const [entriesLoading, setEntriesLoading] = useState(false)
  const [isPayingMonth, setIsPayingMonth] = useState(false)
  const [entryFilterType, setEntryFilterType] = useState<'all' | 'single' | 'range'>('all')
  const [monthToPay, setMonthToPay] = useState<MonthlyFinancialGroup | null>(null)
  const [monthPayAmount, setMonthPayAmount] = useState('')

  const [entryStartDate, setEntryStartDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
  })
  const [entryEndDate, setEntryEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  })
  const [entryMonth, setEntryMonth] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const [selectedFinancialYear, setSelectedFinancialYear] = useState(() => new Date().getFullYear())

  useEffect(() => {
    if (isOpen && customer) {
      setActiveTab('info')
      setHasLoadedDetails(false)
      setEntries([])
      setAllEntries([])
      setInvoices([])
      setPayments([])
      void fetchCustomerData(customer.id)
    }
  }, [isOpen, customer])

  useEffect(() => {
    if (isOpen && customer && (activeTab === 'entries' || activeTab === 'holidays')) {
      let start = entryStartDate;
      let end = entryEndDate;
      
      if (entryFilterType === 'all') {
        start = '2000-01-01';
        end = '2100-01-01';
      } else if (entryFilterType === 'single') {
        start = `${entryMonth}-01`
        end = new Date(new Date(start).getFullYear(), new Date(start).getMonth() + 1, 0).toISOString().split('T')[0]
      }
      
      fetchCustomerEntries(customer.id, start, end)
    }
  }, [isOpen, customer, entryStartDate, entryEndDate, entryFilterType, entryMonth, activeTab])

  const fetchCustomerEntries = async (customerId: string, start: string, end: string) => {
    setEntriesLoading(true)
    try {
      const entriesRes = await axios.get('/api/milk-entries/customer-range', {
        params: { customerId, startDate: start, endDate: end }
      })
      if (entriesRes.data.success) {
        // Sort descending so the latest entries are at the top
        const sortedEntries = entriesRes.data.data.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setEntries(sortedEntries)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setEntriesLoading(false)
    }
  }

  const fetchAllCustomerEntries = async (customerId: string) => {
    try {
      const entriesRes = await axios.get('/api/milk-entries/customer-range', {
        params: { customerId, startDate: '2000-01-01', endDate: '2100-01-01' }
      })

      if (entriesRes.data.success) {
        const sortedEntries = entriesRes.data.data.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
        setAllEntries(sortedEntries)
      }
    } catch (err) {
      console.error(err)
    }
  }

  const fetchCustomerData = async (customerId: string) => {
    try {
      // Fetch invoices and payments (entries are handled by the other useEffect)
      const [invoicesRes, paymentsRes] = await Promise.all([
        axios.get('/api/invoices'),
        axios.get('/api/payments')
      ])

      await fetchAllCustomerEntries(customerId)

      if (invoicesRes.data.success) {
        const customerInvoices = invoicesRes.data.data.filter((i: any) => i.customerId === customerId)
        // Sort descending by date
        customerInvoices.sort((a: any, b: any) => new Date(b.periodStartDate).getTime() - new Date(a.periodStartDate).getTime())
        setInvoices(customerInvoices)
      }

      if (paymentsRes.data.success) {
        const customerPayments = paymentsRes.data.data.filter((p: any) => p.customerId === customerId)
        // Sort descending by date
        customerPayments.sort((a: any, b: any) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime())
        setPayments(customerPayments)
      }

    } catch (err) {
      console.error(err)
    } finally {
      setHasLoadedDetails(true)
    }
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    if (Number.isNaN(d.getTime())) return dateStr
    return new Intl.DateTimeFormat(getDisplayLocale(language), {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).format(d)
  }

  const formatMonthYear = (dateStr: string) => {
    const d = new Date(dateStr)
    if (Number.isNaN(d.getTime())) return dateStr
    return new Intl.DateTimeFormat(getDisplayLocale(language), {
      month: 'long',
      year: 'numeric'
    }).format(d)
  }

  const getMonthBounds = (year: number, monthIndex: number) => {
    const start = new Date(year, monthIndex, 1)
    const end = new Date(year, monthIndex + 1, 0)
    return {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
    }
  }

  const filteredSkippedDates = useMemo(() => {
    if (!customer) return []

    return (customer.skippedDates ?? [])
      .filter((skippedDate) => {
        if (entryFilterType === 'single') {
          return skippedDate.startsWith(entryMonth)
        }

        if (entryFilterType === 'range') {
          return skippedDate >= entryStartDate && skippedDate <= entryEndDate
        }

        return true
      })
      .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
  }, [customer, entryEndDate, entryFilterType, entryMonth, entryStartDate])

  const formatMonthOnly = (year: number, monthIndex: number) => {
    return new Intl.DateTimeFormat(getDisplayLocale(language), {
      month: 'long'
    }).format(new Date(year, monthIndex, 1))
  }

  const toMonthKey = (dateString: string) => {
    const date = new Date(dateString)
    if (Number.isNaN(date.getTime())) return null
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
  }

  const invoicePeriodKey = (invoice: Invoice) => {
    const startDate = invoice.periodStartDate || ''
    const endDate = invoice.periodEndDate || ''
    return `${invoice.customerId ?? ''}|${startDate}|${endDate}`
  }

  const pickPreferredInvoice = (current: Invoice, candidate: Invoice) => {
    if (current.status !== candidate.status) {
      return current.status === 'PAID' ? current : candidate
    }

    const currentAmount = Number(current.totalAmount || 0)
    const candidateAmount = Number(candidate.totalAmount || 0)
    if (candidateAmount !== currentAmount) {
      return candidateAmount > currentAmount ? candidate : current
    }

    const currentDate = new Date(current.periodStartDate || '').getTime()
    const candidateDate = new Date(candidate.periodStartDate || '').getTime()
    if (!Number.isNaN(currentDate) && !Number.isNaN(candidateDate) && currentDate !== candidateDate) {
      return currentDate > candidateDate ? current : candidate
    }

    return String(current.id) >= String(candidate.id) ? current : candidate
  }

  const uniqueInvoices = useMemo(() => {
    const deduped = new Map<string, Invoice>()

    invoices.forEach((invoice) => {
      const key = invoicePeriodKey(invoice)
      const existing = deduped.get(key)
      if (!existing) {
        deduped.set(key, invoice)
        return
      }

      deduped.set(key, pickPreferredInvoice(existing, invoice))
    })

    return Array.from(deduped.values()).sort(
      (a, b) => new Date(b.periodStartDate).getTime() - new Date(a.periodStartDate).getTime()
    )
  }, [invoices])

  const monthlyEntryGroups = useMemo(() => {
    const monthMap = new Map<string, {
      key: string
      label: string
      year: number
      monthIndex: number
      entries: MonthlyEntryRow[]
      deliveredDays: number
      totalLiters: number
      totalAmount: number
    }>()

    const upsertGroup = (dateKey: string) => {
      const date = new Date(dateKey)
      if (Number.isNaN(date.getTime())) return null

      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      const existing = monthMap.get(key)
      if (existing) return existing

      const created = {
        key,
        label: formatMonthYear(dateKey),
        year: date.getFullYear(),
        monthIndex: date.getMonth(),
        entries: [] as MonthlyEntryRow[],
        deliveredDays: 0,
        totalLiters: 0,
        totalAmount: 0,
      }
      monthMap.set(key, created)
      return created
    }

    const skipDateSet = new Set(filteredSkippedDates.map((date) => date.slice(0, 10)))
    const entryByDate = new Map<string, MilkEntry>()

    entries.forEach((entry) => {
      if (!entry.date) return
      entryByDate.set(entry.date.slice(0, 10), entry)
    })

    const allDates = Array.from(new Set([
      ...Array.from(entryByDate.keys()),
      ...Array.from(skipDateSet),
    ])).sort((a, b) => a.localeCompare(b))

    allDates.forEach((dateKey) => {
      const group = upsertGroup(dateKey)
      if (!group) return

      const entry = entryByDate.get(dateKey) ?? null
      if (entry) {
        const hasDelivery = (entry.morningQuantity ?? 0) > 0 || (entry.eveningQuantity ?? 0) > 0
        group.entries.push({
          date: dateKey,
          type: 'entry',
          entry,
        })
        group.deliveredDays += hasDelivery ? 1 : 0
        group.totalLiters += (entry.morningQuantity ?? 0) + (entry.eveningQuantity ?? 0)
        group.totalAmount += Number(entry.totalAmount || 0)
        return
      }

      group.entries.push({
        date: dateKey,
        type: 'holiday',
        entry: null,
      })
    })

    return Array.from(monthMap.values())
      .map((group) => ({
        ...group,
        entries: [...group.entries].sort((a, b) => a.date.localeCompare(b.date)),
      }))
      .sort((a, b) => b.key.localeCompare(a.key))
  }, [entries, filteredSkippedDates, language])

  const monthlyFinancialGroups = useMemo(() => {
    const monthMap = new Map<string, MonthlyFinancialGroup>()

    allEntries.forEach((entry) => {
      const key = toMonthKey(entry.date)
      if (!key) return
      const existing = monthMap.get(key)

      if (existing) {
        existing.billed += entry.totalAmount
        return
      }

      const date = new Date(entry.date)
      const bounds = getMonthBounds(date.getFullYear(), date.getMonth())

      monthMap.set(key, {
        key,
        label: formatMonthOnly(date.getFullYear(), date.getMonth()),
        year: date.getFullYear(),
        monthIndex: date.getMonth(),
        billed: entry.totalAmount,
        paid: 0,
        balance: entry.totalAmount,
        displayBalance: entry.totalAmount,
        hasInvoice: false,
        periodStartDate: bounds.startDate,
        periodEndDate: bounds.endDate,
      })
    })

    uniqueInvoices.forEach((invoice) => {
      const date = new Date(invoice.periodStartDate)
      if (Number.isNaN(date.getTime())) return

      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      const existing = monthMap.get(key)
      const billedAmount = invoice.totalAmount
      const bounds = getMonthBounds(date.getFullYear(), date.getMonth())

      if (existing) {
        existing.billed = existing.hasInvoice ? existing.billed + billedAmount : billedAmount
        existing.paid = existing.hasInvoice ? existing.paid : Math.max(0, existing.paid)
        existing.hasInvoice = true
        existing.invoiceId = invoice.id
        existing.invoiceStatus = invoice.status
        existing.periodStartDate = invoice.periodStartDate || bounds.startDate
        existing.periodEndDate = invoice.periodEndDate || bounds.endDate
        existing.paid = Number(invoice.paidAmount || 0)
        existing.balance = Math.max(0, existing.billed - existing.paid)
        existing.displayBalance = existing.balance > 0 ? existing.balance : existing.billed
        return
      }

      monthMap.set(key, {
        key,
        label: formatMonthOnly(date.getFullYear(), date.getMonth()),
        year: date.getFullYear(),
        monthIndex: date.getMonth(),
        billed: billedAmount,
        paid: Number(invoice.paidAmount || 0),
        balance: Math.max(0, billedAmount - Number(invoice.paidAmount || 0)),
        displayBalance: Math.max(0, billedAmount - Number(invoice.paidAmount || 0)) || billedAmount,
        hasInvoice: true,
        invoiceId: invoice.id,
        invoiceStatus: invoice.status,
        periodStartDate: invoice.periodStartDate || bounds.startDate,
        periodEndDate: invoice.periodEndDate || bounds.endDate,
      })
    })

    payments.forEach((payment) => {
      const paymentMonthKey = toMonthKey(payment.paymentDate)
      if (!paymentMonthKey) return

      const existing = monthMap.get(paymentMonthKey)
      if (existing?.hasInvoice) return

      if (!existing) {
        const [yearStr, monthStr] = paymentMonthKey.split('-')
        const year = Number(yearStr)
        const monthIndex = Number(monthStr) - 1
        const bounds = getMonthBounds(year, monthIndex)

        monthMap.set(paymentMonthKey, {
          key: paymentMonthKey,
          label: formatMonthOnly(year, monthIndex),
          year,
          monthIndex,
          billed: 0,
          paid: 0,
          balance: 0,
          displayBalance: 0,
          hasInvoice: false,
          periodStartDate: bounds.startDate,
          periodEndDate: bounds.endDate,
        })
      }

      const target = monthMap.get(paymentMonthKey)
      if (!target) return
      target.paid += Number(payment.amount || 0)
      target.balance = Math.max(0, target.billed - target.paid)
      target.displayBalance = target.balance > 0 ? target.balance : target.billed
    })

    return Array.from(monthMap.values())
      .map((group) => ({
        ...group,
        balance: Math.max(0, group.billed - group.paid),
        displayBalance: group.balance > 0 ? group.balance : group.billed,
      }))
      .sort((a, b) => b.key.localeCompare(a.key))
  }, [allEntries, uniqueInvoices, payments, language])

  const financialYears = useMemo(() => {
    const years = new Set<number>()

    monthlyFinancialGroups.forEach((group) => {
      years.add(group.year)
    })

    years.add(new Date().getFullYear())

    return Array.from(years).sort((a, b) => b - a)
  }, [monthlyFinancialGroups])

  useEffect(() => {
    if (!financialYears.includes(selectedFinancialYear)) {
      setSelectedFinancialYear(financialYears[0] ?? new Date().getFullYear())
    }
  }, [financialYears, selectedFinancialYear])

  const selectedYearMonthlyBalances = useMemo(() => {
    const groupsByMonth = new Map<number, MonthlyFinancialGroup>()

    monthlyFinancialGroups
      .filter((group) => group.year === selectedFinancialYear)
      .forEach((group) => {
        groupsByMonth.set(group.monthIndex, group)
      })

    return Array.from({ length: 12 }, (_, monthIndex) => ({
      key: `${selectedFinancialYear}-${monthIndex}`,
      label: formatMonthOnly(selectedFinancialYear, monthIndex),
      year: selectedFinancialYear,
      monthIndex,
      billed: groupsByMonth.get(monthIndex)?.billed ?? 0,
      paid: groupsByMonth.get(monthIndex)?.paid ?? 0,
      balance: groupsByMonth.get(monthIndex)?.balance ?? 0,
      displayBalance: groupsByMonth.get(monthIndex)?.displayBalance ?? 0,
      hasInvoice: groupsByMonth.get(monthIndex)?.hasInvoice ?? false,
      invoiceId: groupsByMonth.get(monthIndex)?.invoiceId,
      invoiceStatus: groupsByMonth.get(monthIndex)?.invoiceStatus,
      periodStartDate: groupsByMonth.get(monthIndex)?.periodStartDate ?? getMonthBounds(selectedFinancialYear, monthIndex).startDate,
      periodEndDate: groupsByMonth.get(monthIndex)?.periodEndDate ?? getMonthBounds(selectedFinancialYear, monthIndex).endDate,
    }))
  }, [monthlyFinancialGroups, selectedFinancialYear, language])

  const getMonthlySummaryText = (deliveredDays: number, totalLiters: number, totalAmount: number) => {
    if (language === 'mr') {
      return `${t(language, 'deliveredDaysLabel')}: ${deliveredDays} ${t(language, 'daysLabel')} • ${totalLiters} L • ₹${totalAmount}`
    }

    return `${t(language, 'deliveredDaysLabel')}: ${deliveredDays} ${t(language, 'daysLabel')} • ${totalLiters} L • ₹${totalAmount}`
  }

  const entriesTabLabel = useMemo(() => {
    const latestMonthGroup = monthlyEntryGroups[0]
    const baseLabel = `${t(language, 'entriesLabel')} (${entries.length})`

    if (!latestMonthGroup) {
      return baseLabel
    }

    const shortMonth = new Intl.DateTimeFormat(getDisplayLocale(language), {
      month: 'short'
    }).format(new Date(latestMonthGroup.entries[0].date))

    if (language === 'mr') {
      return `${baseLabel} • ${shortMonth}: ${latestMonthGroup.deliveredDays} ${t(language, 'daysLabel')}`
    }

    return `${baseLabel} • ${shortMonth}: ${latestMonthGroup.deliveredDays} ${t(language, 'daysLabel')}`
  }, [entries.length, language, monthlyEntryGroups])

  const handlePayMonthBalance = async () => {
    if (!monthToPay || !customer) return

    const parsedAmount = Number(monthPayAmount || monthToPay.balance || 0)
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      toast.error(language === 'mr' ? 'कृपया योग्य रक्कम भरा.' : 'Please enter a valid amount.')
      return
    }
    if (parsedAmount > monthToPay.balance) {
      toast.error(language === 'mr' ? 'बाकी रकमेपेक्षा जास्त भरणे शक्य नाही.' : 'Amount cannot exceed the remaining due.')
      return
    }

    setIsPayingMonth(true)
    try {
      let invoiceId = monthToPay.invoiceId

      if (!invoiceId) {
        const res = await axios.post('/api/invoices/generate', null, {
          params: {
            customerId: customer.id,
            startDate: monthToPay.periodStartDate,
            endDate: monthToPay.periodEndDate,
          }
        })

        if (!res.data?.success || !res.data?.data?.id) {
          throw new Error('Failed to generate invoice')
        }

        invoiceId = res.data.data.id
      }

      const payRes = await axios.put(`/api/invoices/${invoiceId}/pay`, null, {
        params: {
          amount: parsedAmount,
        },
      })
      if (!payRes.data?.success) {
        throw new Error('Failed to pay invoice')
      }

      invalidateCustomerCache()
      invalidateViewCache('view-cache-billing-invoices')
      invalidateViewCache('view-cache-payments')
      await fetchCustomerData(customer.id)
      onCustomerUpdated?.()
      setMonthToPay(null)
      setMonthPayAmount('')
      toast.success(t(language, 'monthBalancePaid'))
    } catch (err) {
      console.error(err)
      toast.error(t(language, 'failedPayMonthBalance'))
    } finally {
      setIsPayingMonth(false)
    }
  }

  const openMonthDetails = (group: MonthlyFinancialGroup) => {
    if (!customer) return
    navigate(`/customers/${customer.id}/month/${group.year}/${group.monthIndex + 1}`)
  }

  const getMilkTypeLabel = (milkType: string) => {
    if (milkType === 'COW') return t(language, 'cow')
    if (milkType === 'BUFFALO') return t(language, 'buffalo')
    return milkType
  }

  if (!customer) return null

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-5xl max-h-[86vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-4 sm:px-6 pt-5 sm:pt-6 pb-2 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-xl dark:bg-white dark:text-black">
              {customer.name.charAt(0)}
            </div>
            <div>
              <DialogTitle className="text-xl sm:text-2xl font-bold">{customer.name}</DialogTitle>
              <DialogDescription className="sr-only">{t(language, 'customerDetailsHistory')}</DialogDescription>
              <div className="text-sm text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
                <span>{customer.phone || t(language, 'noPhone')}</span>
                <span>•</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${customer.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-700'}`}>
                  {customer.active ? t(language, 'active') : t(language, 'inactive')}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex gap-2 mt-4 sm:mt-5 overflow-x-auto no-scrollbar pb-1">
            {[
              { id: 'info', label: t(language, 'overview') },
              { id: 'entries', label: entriesTabLabel },
              { id: 'holidays', label: `${t(language, 'holidays')} (${filteredSkippedDates.length})` },
              { id: 'invoices', label: `${t(language, 'billsLabel')} (${uniqueInvoices.length})` },
              { id: 'payments', label: `${t(language, 'paymentsLabel')} (${payments.length})` }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors ${
                  activeTab === tab.id 
                    ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-black' 
                    : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-800 dark:border-slate-700 dark:bg-[#111111] dark:text-slate-300 dark:hover:border-slate-600 dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-3 sm:p-4 bg-slate-50/50 dark:bg-slate-900/20">
          <>
              {activeTab === 'info' && (
                <div className="grid grid-cols-1 md:grid-cols-[0.95fr_1.35fr] gap-3 md:items-start">
                  <div className="self-start bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-200 dark:border-slate-700">
                    <h3 className="font-semibold text-slate-700 dark:text-slate-200 mb-3">{t(language, 'customerDetails')}</h3>
                    <div className="grid grid-cols-1 gap-2 text-sm">
                      <div className="flex items-start justify-between gap-4 rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-900">
                        <span className="text-slate-500">{t(language, 'addressLabel')}</span>
                        <span className="max-w-[55%] text-right font-medium text-slate-800 dark:text-slate-200">{customer.address || '-'}</span>
                      </div>
                      <div className="flex items-center justify-between gap-4 rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-900">
                        <span className="text-slate-500">{t(language, 'milkType')}</span>
                        <span className="font-medium text-slate-800 dark:text-slate-200">{getMilkTypeLabel(customer.milkType)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-4 rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-900">
                        <span className="text-slate-500">{t(language, 'dailyQuantityLabel')}</span>
                        <span className="font-medium text-slate-800 dark:text-slate-200">{customer.dailyQuantity} L</span>
                      </div>
                      <div className="flex items-center justify-between gap-4 rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-900">
                        <span className="text-slate-500">{t(language, 'ratePerLiterLabel')}</span>
                        <span className="font-medium text-slate-800 dark:text-slate-200">₹{customer.ratePerLiter}</span>
                      </div>
                    </div>
                  </div>
                  <div className="self-start bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-200 dark:border-slate-700">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <h3 className="font-semibold text-slate-700 dark:text-slate-200">{t(language, 'financialOverview')}</h3>
                      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-right shadow-sm">
                        <div className="text-[11px] font-medium text-slate-500">{t(language, 'currentBalance')}</div>
                        <div className={`text-lg font-extrabold leading-tight ${customer.balance > 0 ? 'text-emerald-600' : customer.balance < 0 ? 'text-red-500' : 'text-slate-700 dark:text-slate-200'}`}>
                          ₹{customer.balance}
                        </div>
                      </div>
                    </div>
                    <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                      <div className="px-4 py-3 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3">
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{t(language, 'monthlyBalances')}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{t(language, 'yearLabel')}</span>
                          <select
                            value={selectedFinancialYear}
                            onChange={(e) => setSelectedFinancialYear(Number(e.target.value))}
                            className="rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-[#111111] px-2.5 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-white/30"
                          >
                            {financialYears.map((year) => (
                              <option key={year} value={year}>{year}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="max-h-[26rem] overflow-y-auto">
                        {!hasLoadedDetails ? (
                          <LoadingBlock label={t(language, 'loadingDetails')} minHeightClassName="min-h-[14rem]" size="sm" />
                        ) : selectedYearMonthlyBalances.length === 0 ? (
                          <div className="px-4 py-5 text-sm text-center text-slate-500">{t(language, 'noBillsFound')}</div>
                        ) : (
                          selectedYearMonthlyBalances.map((group) => (
                            <div
                              key={group.key}
                              role="button"
                              tabIndex={0}
                              onClick={() => openMonthDetails(group)}
                              onKeyDown={(event) => {
                                if (event.key === 'Enter' || event.key === ' ') {
                                  event.preventDefault()
                                  openMonthDetails(group)
                                }
                              }}
                              className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 last:border-b-0 cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                  <span className="block text-sm font-semibold text-slate-800 dark:text-slate-100">{group.label}</span>
                                  {group.invoiceStatus === 'PAID' ? (
                                    <span className="mt-1 inline-flex rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700 dark:bg-white dark:text-black">
                                      {t(language, 'paid')}
                                    </span>
                                  ) : null}
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="text-right">
                                    <span className="block text-sm font-bold text-slate-700 dark:text-white">
                                      ₹{group.billed > 0
                                        ? (group.balance > 0 ? group.balance : group.billed)
                                        : group.balance}
                                    </span>
                                    {group.paid > 0 && group.balance > 0 ? (
                                      <span className="mt-0.5 block text-[10px] font-medium text-slate-500 dark:text-slate-400">
                                        {language === 'mr'
                                          ? `भरले ₹${group.paid} • बाकी ₹${group.balance}`
                                          : `Paid ₹${group.paid} • Due ₹${group.balance}`}
                                      </span>
                                    ) : null}
                                  </div>
                                  {group.balance > 0 ? (
                                    <button
                                      type="button"
                                      onClick={(event) => {
                                        event.stopPropagation()
                                        setMonthToPay(group)
                                        setMonthPayAmount(String(group.balance > 0 ? group.balance : group.billed || 0))
                                      }}
                                      className="h-8 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-900 shadow-sm transition hover:bg-slate-100 dark:border-slate-700 dark:bg-[#111111] dark:text-white dark:hover:bg-slate-800"
                                    >
                                      {group.paid > 0
                                        ? (language === 'mr' ? 'बाकी भरा' : 'Pay Due')
                                        : t(language, 'payMonthBalance')}
                                    </button>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'entries' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row gap-3 items-end px-1">
                    <div className="w-full sm:w-1/3">
                      <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">{t(language, 'filterEntries')}</label>
                      <select
                        value={entryFilterType}
                        onChange={(e) => setEntryFilterType(e.target.value as any)}
                        className="w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-[#111111] px-3 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-white/30 shadow-sm"
                      >
                        <option value="all">{t(language, 'allEntries')}</option>
                        <option value="single">{t(language, 'specificMonth')}</option>
                        <option value="range">{t(language, 'dateRange')}</option>
                      </select>
                    </div>

                    {entryFilterType === 'range' && (
                      <>
                        <div className="w-full sm:w-1/3">
                          <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">{t(language, 'fromDate')}</label>
                          <input 
                            type="date" 
                            value={entryStartDate}
                            onChange={e => setEntryStartDate(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-[#111111] px-3 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-white/30 shadow-sm"
                          />
                        </div>
                        <div className="w-full sm:w-1/3">
                          <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">{t(language, 'toDate')}</label>
                          <input 
                            type="date" 
                            value={entryEndDate}
                            onChange={e => setEntryEndDate(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-[#111111] px-3 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-white/30 shadow-sm"
                          />
                        </div>
                      </>
                    )}
                    
                    {entryFilterType === 'single' && (
                      <div className="w-full sm:w-1/3">
                        <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">{t(language, 'monthLabel')}</label>
                        <input 
                          type="month"
                          value={entryMonth}
                          onChange={e => setEntryMonth(e.target.value)}
                          className="w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-[#111111] px-3 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-white/30 shadow-sm"
                        />
                      </div>
                    )}
                  </div>
                  
                  <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden relative">
                    {!hasLoadedDetails ? (
                      <LoadingBlock label={t(language, 'loadingDetails')} minHeightClassName="min-h-[18rem]" size="md" />
                    ) : (
                      <>
                    {entriesLoading && (
                      <div className="absolute inset-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm z-10 flex items-center justify-center">
                        <LoadingBlock label={t(language, 'loadingShort')} size="sm" />
                      </div>
                    )}
                    <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                        <tr>
                          <th className="px-4 py-3 font-medium text-slate-500 whitespace-nowrap">{t(language, 'dateWord')}</th>
                          <th className="px-4 py-3 font-medium text-slate-500 whitespace-nowrap">{t(language, 'morningWord')}</th>
                          <th className="px-4 py-3 font-medium text-slate-500 whitespace-nowrap">{t(language, 'eveningWord')}</th>
                          <th className="px-4 py-3 font-medium text-right text-slate-500 whitespace-nowrap">{t(language, 'amountColumn')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {entries.length === 0 ? (
                          <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-500">{t(language, 'noEntriesThisMonth')}</td></tr>
                        ) : (
                          monthlyEntryGroups.map((group) => (
                            <Fragment key={group.key}>
                              <tr key={`${group.key}-summary`} className="border-y border-primary-100 bg-primary-50/70 dark:border-zinc-700 dark:bg-white/5">
                                <td colSpan={4} className="px-4 py-3">
                                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                                    <span className="font-semibold text-slate-900 dark:text-slate-100">{group.label}</span>
                                    <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                                      {getMonthlySummaryText(group.deliveredDays, group.totalLiters, group.totalAmount)}
                                    </span>
                                  </div>
                                </td>
                              </tr>
                              {group.entries.map((row) => (
                                <tr key={`${group.key}-${row.date}`} className="border-b border-slate-100 dark:border-slate-700/50 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                                  <td className="px-4 py-3 whitespace-nowrap">{formatDate(row.date)}</td>
                                  <td className="px-4 py-3 whitespace-nowrap">
                                    {row.type === 'holiday' ? (
                                      <span className="text-[10px] font-bold text-rose-600 bg-rose-50 dark:bg-rose-500/10 dark:text-rose-400 px-2 py-0.5 rounded-full border border-rose-100 dark:border-rose-500/20">{t(language, 'holiday')}</span>
                                    ) : (!row.entry?.morningQuantity || row.entry.morningQuantity === 0) ? (
                                      <span className="text-[10px] font-bold text-rose-600 bg-rose-50 dark:bg-rose-500/10 dark:text-rose-400 px-2 py-0.5 rounded-full border border-rose-100 dark:border-rose-500/20">{t(language, 'holiday')}</span>
                                    ) : (
                                      `${row.entry.morningQuantity} L`
                                    )}
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap">
                                    {row.type === 'holiday' ? (
                                      <span className="text-[10px] font-bold text-rose-600 bg-rose-50 dark:bg-rose-500/10 dark:text-rose-400 px-2 py-0.5 rounded-full border border-rose-100 dark:border-rose-500/20">{t(language, 'holiday')}</span>
                                    ) : (!row.entry?.eveningQuantity || row.entry.eveningQuantity === 0) ? (
                                      <span className="text-[10px] font-bold text-rose-600 bg-rose-50 dark:bg-rose-500/10 dark:text-rose-400 px-2 py-0.5 rounded-full border border-rose-100 dark:border-rose-500/20">{t(language, 'holiday')}</span>
                                    ) : (
                                      `${row.entry.eveningQuantity} L`
                                    )}
                                  </td>
                                  <td className="px-4 py-3 font-medium text-right whitespace-nowrap">
                                    {row.type === 'holiday' ? '₹0' : `₹${Number(row.entry?.totalAmount || 0)}`}
                                  </td>
                                </tr>
                              ))}
                            </Fragment>
                          ))
                        )}
                      </tbody>
                    </table>
                    </div>
                      </>
                    )}
                </div>
                </div>
              )}

              {activeTab === 'holidays' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row gap-3 items-end px-1">
                    <div className="w-full sm:w-1/3">
                      <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">{t(language, 'filterEntries')}</label>
                      <select
                        value={entryFilterType}
                        onChange={(e) => setEntryFilterType(e.target.value as any)}
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 shadow-sm"
                      >
                        <option value="all">{t(language, 'allEntries')}</option>
                        <option value="single">{t(language, 'specificMonth')}</option>
                        <option value="range">{t(language, 'dateRange')}</option>
                      </select>
                    </div>

                    {entryFilterType === 'range' && (
                      <>
                        <div className="w-full sm:w-1/3">
                          <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">{t(language, 'fromDate')}</label>
                          <input
                            type="date"
                            value={entryStartDate}
                            onChange={e => setEntryStartDate(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 shadow-sm"
                          />
                        </div>
                        <div className="w-full sm:w-1/3">
                          <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">{t(language, 'toDate')}</label>
                          <input
                            type="date"
                            value={entryEndDate}
                            onChange={e => setEntryEndDate(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 shadow-sm"
                          />
                        </div>
                      </>
                    )}

                    {entryFilterType === 'single' && (
                      <div className="w-full sm:w-1/3">
                        <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">{t(language, 'monthLabel')}</label>
                        <input
                          type="month"
                          value={entryMonth}
                          onChange={e => setEntryMonth(e.target.value)}
                          className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 shadow-sm"
                        />
                      </div>
                    )}
                  </div>

                  <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                    {!hasLoadedDetails ? (
                      <LoadingBlock label={t(language, 'loadingDetails')} minHeightClassName="min-h-[18rem]" size="md" />
                    ) : (
                      <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                          <tr>
                            <th className="px-4 py-3 font-medium text-slate-500 whitespace-nowrap">{t(language, 'dateWord')}</th>
                            <th className="px-4 py-3 font-medium text-slate-500 whitespace-nowrap">{t(language, 'statusColumn')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredSkippedDates.length === 0 ? (
                            <tr><td colSpan={2} className="px-4 py-8 text-center text-slate-500">{t(language, 'noHolidaysFound')}</td></tr>
                          ) : (
                            filteredSkippedDates.map((holidayDate) => (
                              <tr key={holidayDate} className="border-b border-slate-100 dark:border-slate-700/50 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                                <td className="px-4 py-3 whitespace-nowrap">{formatDate(holidayDate)}</td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <span className="text-[10px] font-bold text-rose-600 bg-rose-50 dark:bg-rose-500/10 dark:text-rose-400 px-2 py-0.5 rounded-full border border-rose-100 dark:border-rose-500/20">
                                    {t(language, 'holiday')}
                                  </span>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                    </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'invoices' && (
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                        <tr>
                          <th className="px-4 py-3 font-medium text-slate-500 whitespace-nowrap">{t(language, 'period')}</th>
                          <th className="px-4 py-3 font-medium text-slate-500 whitespace-nowrap">{t(language, 'statusColumn')}</th>
                          <th className="px-4 py-3 font-medium text-right text-slate-500 whitespace-nowrap">{t(language, 'amountColumn')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {uniqueInvoices.length === 0 ? (
                          <tr><td colSpan={3} className="px-4 py-8 text-center text-slate-500">{t(language, 'noBillsFound')}</td></tr>
                        ) : (
                          uniqueInvoices.map(invoice => (
                            <tr key={invoice.id} className="border-b border-slate-100 dark:border-slate-700/50 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                              <td className="px-4 py-3 whitespace-nowrap">{formatDate(invoice.periodStartDate)} - {formatDate(invoice.periodEndDate)}</td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span className={`px-2 py-1 rounded-md text-xs font-semibold ${
                                  invoice.status === 'PAID' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                                }`}>
                                  {invoice.status === 'PAID' ? t(language, 'paid') : t(language, 'pending')}
                                </span>
                              </td>
                              <td className="px-4 py-3 font-medium text-right whitespace-nowrap">₹{invoice.totalAmount}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === 'payments' && (
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                        <tr>
                          <th className="px-4 py-3 font-medium text-slate-500 whitespace-nowrap">{t(language, 'dateWord')}</th>
                            <th className="px-4 py-3 font-medium text-slate-500 whitespace-nowrap">{t(language, 'statusColumn')}</th>
                            <th className="px-4 py-3 font-medium text-right text-slate-500 whitespace-nowrap">{t(language, 'amountColumn')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {payments.length === 0 ? (
                          <tr><td colSpan={3} className="px-4 py-8 text-center text-slate-500">{t(language, 'noPaymentsFound')}</td></tr>
                        ) : (
                          payments.map(payment => (
                            <tr key={payment.id} className="border-b border-slate-100 dark:border-slate-700/50 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                              <td className="px-4 py-3 whitespace-nowrap">{formatDate(payment.paymentDate)}</td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span className={`px-2 py-1 rounded-md text-xs font-semibold ${
                                  payment.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'
                                }`}>
                                  {payment.status === 'COMPLETED' ? t(language, 'completed') : t(language, 'pending')}
                                </span>
                              </td>
                              <td className="px-4 py-3 font-medium text-emerald-600 text-right whitespace-nowrap">+₹{payment.amount}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
        </div>
      </DialogContent>

      <ConfirmDialog
        isOpen={!!monthToPay}
        onClose={() => {
          setMonthToPay(null)
          setMonthPayAmount('')
        }}
        onConfirm={handlePayMonthBalance}
        isProcessing={isPayingMonth}
        title={t(language, 'payMonthBalanceTitle')}
        description={
          monthToPay
        ? `${monthToPay.label} • ${language === 'mr'
            ? `एकूण ₹${monthToPay.billed} • भरले ₹${monthToPay.paid} • बाकी ₹${monthToPay.balance}`
            : `Total ₹${monthToPay.billed} • Paid ₹${monthToPay.paid} • Due ₹${monthToPay.balance}`}`
            : t(language, 'payMonthBalanceDesc')
        }
        confirmText={isPayingMonth ? t(language, 'generating') : t(language, 'payMonthBalance')}
        cancelText={t(language, 'cancel')}
        isDestructive={false}
      >
        {monthToPay ? (
          <div className="space-y-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
              {language === 'mr'
                ? `एकूण ₹${monthToPay.billed} • भरले ₹${monthToPay.paid} • बाकी ₹${monthToPay.balance}`
                : `Total ₹${monthToPay.billed} • Paid ₹${monthToPay.paid} • Due ₹${monthToPay.balance}`}
            </div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
              {language === 'mr' ? 'भरण्याची रक्कम' : 'Amount to pay'}
            </label>
            <input
              type="number"
              min="1"
              max={String(monthToPay.balance || monthToPay.billed || 0)}
              step="0.01"
              value={monthPayAmount}
              onChange={(event) => {
                const nextValue = event.target.value
                if (nextValue === '') {
                  setMonthPayAmount('')
                  return
                }
                const nextAmount = Number(nextValue)
                if (Number.isFinite(nextAmount) && nextAmount <= (monthToPay.balance || monthToPay.billed || 0)) {
                  setMonthPayAmount(nextValue)
                }
              }}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-500 dark:border-slate-700 dark:bg-[#111111] dark:text-white dark:focus:ring-white/30"
              placeholder={String(monthToPay.balance || monthToPay.billed)}
            />
          </div>
        ) : null}
      </ConfirmDialog>
    </Dialog>
  )
}
