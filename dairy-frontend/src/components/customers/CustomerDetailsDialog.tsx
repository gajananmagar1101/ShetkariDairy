import { Fragment, useState, useEffect, useMemo } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog'
import { Button } from '../ui/button'
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

interface CustomerDetailsDialogProps {
  customer: Customer | null
  isOpen: boolean
  onClose: () => void
  onCustomerUpdated?: () => void
}

export function CustomerDetailsDialog({ customer, isOpen, onClose, onCustomerUpdated }: CustomerDetailsDialogProps) {
  const { language } = useSettingsStore()
  const [activeTab, setActiveTab] = useState<'info' | 'entries' | 'holidays' | 'invoices' | 'payments'>('info')
  const [entries, setEntries] = useState<MilkEntry[]>([])
  const [allEntries, setAllEntries] = useState<MilkEntry[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [entriesLoading, setEntriesLoading] = useState(false)
  const [isPayingMonth, setIsPayingMonth] = useState(false)
  const [entryFilterType, setEntryFilterType] = useState<'all' | 'single' | 'range'>('all')
  const [monthToPay, setMonthToPay] = useState<MonthlyFinancialGroup | null>(null)

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
      fetchCustomerData(customer.id)
    }
  }, [isOpen, customer])

  useEffect(() => {
    if (isOpen && customer) {
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
  }, [isOpen, customer, entryStartDate, entryEndDate, entryFilterType, entryMonth])

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
    setIsLoading(true)
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
      setIsLoading(false)
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

  const getMonthKeysBetween = (startDate: string, endDate: string) => {
    const start = new Date(startDate)
    const end = new Date(endDate)
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return []

    const keys: string[] = []
    const cursor = new Date(start.getFullYear(), start.getMonth(), 1)
    const last = new Date(end.getFullYear(), end.getMonth(), 1)

    while (cursor <= last) {
      keys.push(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`)
      cursor.setMonth(cursor.getMonth() + 1)
    }

    return keys
  }

  const invoicePeriodKey = (invoice: Invoice) => {
    const startDate = invoice.periodStartDate || ''
    const endDate = invoice.periodEndDate || ''
    return `${invoice.customerId ?? ''}|${startDate}|${endDate}`
  }

  const pickPreferredInvoice = (current: Invoice, candidate: Invoice) => {
    const currentAmount = Number(current.totalAmount || 0)
    const candidateAmount = Number(candidate.totalAmount || 0)
    if (candidateAmount !== currentAmount) {
      return candidateAmount > currentAmount ? candidate : current
    }

    if (current.status !== candidate.status) {
      return current.status === 'PAID' ? current : candidate
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
    const groups: Array<{
      key: string
      label: string
      entries: MilkEntry[]
      deliveredDays: number
      totalLiters: number
      totalAmount: number
    }> = []

    entries.forEach((entry) => {
      const date = new Date(entry.date)
      if (Number.isNaN(date.getTime())) return

      const key = `${date.getFullYear()}-${date.getMonth()}`
      const existingGroup = groups[groups.length - 1]
      const hasDelivery = entry.morningQuantity > 0 || entry.eveningQuantity > 0
      const totalLiters = entry.morningQuantity + entry.eveningQuantity

      if (!existingGroup || existingGroup.key !== key) {
        groups.push({
          key,
          label: formatMonthYear(entry.date),
          entries: [entry],
          deliveredDays: hasDelivery ? 1 : 0,
          totalLiters,
          totalAmount: entry.totalAmount
        })
        return
      }

      existingGroup.entries.push(entry)
      existingGroup.deliveredDays += hasDelivery ? 1 : 0
      existingGroup.totalLiters += totalLiters
      existingGroup.totalAmount += entry.totalAmount
    })

    return groups
  }, [entries, language])

  const monthlyFinancialGroups = useMemo(() => {
    const monthMap = new Map<string, MonthlyFinancialGroup>()
    const paymentAllocationByMonth = new Map<string, number>()

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
        existing.hasInvoice = true
        existing.invoiceId = invoice.id
        existing.invoiceStatus = invoice.status
        existing.periodStartDate = invoice.periodStartDate || bounds.startDate
        existing.periodEndDate = invoice.periodEndDate || bounds.endDate
        return
      }

      monthMap.set(key, {
        key,
        label: formatMonthOnly(date.getFullYear(), date.getMonth()),
        year: date.getFullYear(),
        monthIndex: date.getMonth(),
        billed: billedAmount,
        paid: 0,
        balance: billedAmount,
        displayBalance: billedAmount,
        hasInvoice: true,
        invoiceId: invoice.id,
        invoiceStatus: invoice.status,
        periodStartDate: invoice.periodStartDate || bounds.startDate,
        periodEndDate: invoice.periodEndDate || bounds.endDate,
      })
    })

    payments.forEach((payment) => {
      const paidFromDate = payment.paidFromDate ?? null
      const paidToDate = payment.paidToDate ?? null
      const paymentMonthKey = toMonthKey(payment.paymentDate)
      const rangeKeys =
        paidFromDate && paidToDate
          ? getMonthKeysBetween(paidFromDate, paidToDate)
          : (paymentMonthKey ? [paymentMonthKey] : [])

      if (rangeKeys.length === 0) return

      rangeKeys.forEach((monthKey) => {
        if (monthMap.has(monthKey)) return
        const [yearStr, monthStr] = monthKey.split('-')
        const year = Number(yearStr)
        const monthIndex = Number(monthStr) - 1
        const bounds = getMonthBounds(year, monthIndex)

        monthMap.set(monthKey, {
          key: monthKey,
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
      })

      const coveredEntriesByMonth = new Map<string, number>()
      let coveredTotal = 0

      if (paidFromDate && paidToDate) {
        allEntries.forEach((entry) => {
          if (entry.date < paidFromDate || entry.date > paidToDate) return
          const monthKey = toMonthKey(entry.date)
          if (!monthKey) return
          const next = (coveredEntriesByMonth.get(monthKey) ?? 0) + entry.totalAmount
          coveredEntriesByMonth.set(monthKey, next)
          coveredTotal += entry.totalAmount
        })
      }

      const allocateAcrossMonths = (amount: number) => {
        if (amount <= 0) return

        if (!paidFromDate || !paidToDate || coveredTotal <= 0 || coveredEntriesByMonth.size === 0) {
          const monthKey = rangeKeys[0]
          paymentAllocationByMonth.set(monthKey, (paymentAllocationByMonth.get(monthKey) ?? 0) + amount)
          return
        }

        let remainder = amount
        rangeKeys.forEach((monthKey, index) => {
          const monthCoveredAmount = coveredEntriesByMonth.get(monthKey) ?? 0
          const allocated = index === rangeKeys.length - 1
            ? remainder
            : Number(((amount * monthCoveredAmount) / coveredTotal).toFixed(2))
          remainder -= allocated
          paymentAllocationByMonth.set(monthKey, (paymentAllocationByMonth.get(monthKey) ?? 0) + allocated)
        })
      }

      allocateAcrossMonths(payment.amount)
    })

    return Array.from(monthMap.values())
      .map((group) => ({
        ...group,
        paid: group.paid + (paymentAllocationByMonth.get(group.key) ?? 0),
        balance: Math.max(
          0,
          group.billed - (group.paid + (paymentAllocationByMonth.get(group.key) ?? 0))
        ),
        displayBalance: group.hasInvoice && group.invoiceStatus === 'PAID'
          ? group.billed
          : Math.max(
              0,
              group.billed - (group.paid + (paymentAllocationByMonth.get(group.key) ?? 0))
            ),
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

      const payRes = await axios.put(`/api/invoices/${invoiceId}/pay`)
      if (!payRes.data?.success) {
        throw new Error('Failed to pay invoice')
      }

      invalidateCustomerCache()
      invalidateViewCache('view-cache-billing-invoices')
      invalidateViewCache('view-cache-payments')
      await fetchCustomerData(customer.id)
      onCustomerUpdated?.()
      setMonthToPay(null)
      toast.success(t(language, 'monthBalancePaid'))
    } catch (err) {
      console.error(err)
      toast.error(t(language, 'failedPayMonthBalance'))
    } finally {
      setIsPayingMonth(false)
    }
  }

  const getMilkTypeLabel = (milkType: string) => {
    if (milkType === 'COW') return t(language, 'cow')
    if (milkType === 'BUFFALO') return t(language, 'buffalo')
    return milkType
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
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
  }, [customer, entries, entryEndDate, entryFilterType, entryMonth, entryStartDate])

  if (!customer) return null

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
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
          
          <div className="flex gap-4 mt-4 sm:mt-6 overflow-x-auto no-scrollbar pb-1">
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
                className={`pb-3 text-sm font-semibold whitespace-nowrap transition-colors border-b-2 ${
                  activeTab === tab.id 
                    ? 'border-primary-600 text-primary-600 dark:border-white dark:text-white' 
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/50 dark:bg-slate-900/20">
          {isLoading ? (
            <LoadingBlock label={t(language, 'loadingDetails')} minHeightClassName="min-h-[200px]" size="md" />
          ) : (
            <>
              {activeTab === 'info' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-200 dark:border-slate-700">
                    <h3 className="font-semibold text-slate-700 dark:text-slate-200 mb-4">{t(language, 'customerDetails')}</h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-500">{t(language, 'addressLabel')}</span>
                        <span className="font-medium text-right text-slate-800 dark:text-slate-200">{customer.address || '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">{t(language, 'milkType')}</span>
                        <span className="font-medium text-slate-800 dark:text-slate-200">{getMilkTypeLabel(customer.milkType)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">{t(language, 'dailyQuantityLabel')}</span>
                        <span className="font-medium text-slate-800 dark:text-slate-200">{customer.dailyQuantity} L</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">{t(language, 'ratePerLiterLabel')}</span>
                        <span className="font-medium text-slate-800 dark:text-slate-200">₹{customer.ratePerLiter}</span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-200 dark:border-slate-700">
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
                      <div className="max-h-80 overflow-y-auto">
                        {selectedYearMonthlyBalances.length === 0 ? (
                          <div className="px-4 py-6 text-sm text-center text-slate-500">{t(language, 'noBillsFound')}</div>
                        ) : (
                          selectedYearMonthlyBalances.map((group) => (
                            <div key={group.key} className="px-4 py-4 border-b border-slate-100 dark:border-slate-700 last:border-b-0">
                              <div className="flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                  <span className="block text-base font-semibold text-slate-800 dark:text-slate-100">{group.label}</span>
                                  {group.invoiceStatus === 'PAID' ? (
                                    <span className="mt-1 inline-flex rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700 dark:bg-white dark:text-black">
                                      {t(language, 'paid')}
                                    </span>
                                  ) : null}
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-base font-bold text-slate-700 dark:text-white">
                                    ₹{group.displayBalance}
                                  </span>
                                  {group.balance > 0 && group.invoiceStatus !== 'PAID' ? (
                                    <Button
                                      type="button"
                                      size="sm"
                                      onClick={() => setMonthToPay(group)}
                                      className="h-8 rounded-full bg-white text-black shadow-none hover:bg-zinc-200 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
                                    >
                                      {t(language, 'payMonthBalance')}
                                    </Button>
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
                              {group.entries.map((entry) => (
                                <tr key={entry.id} className="border-b border-slate-100 dark:border-slate-700/50 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                                  <td className="px-4 py-3 whitespace-nowrap">{formatDate(entry.date)}</td>
                                  <td className="px-4 py-3 whitespace-nowrap">
                                    {(!entry.morningQuantity || entry.morningQuantity === 0) ? (
                                      <span className="text-[10px] font-bold text-rose-600 bg-rose-50 dark:bg-rose-500/10 dark:text-rose-400 px-2 py-0.5 rounded-full border border-rose-100 dark:border-rose-500/20">{t(language, 'holiday')}</span>
                                    ) : (
                                      `${entry.morningQuantity} L`
                                    )}
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap">
                                    {(!entry.eveningQuantity || entry.eveningQuantity === 0) ? (
                                      <span className="text-[10px] font-bold text-rose-600 bg-rose-50 dark:bg-rose-500/10 dark:text-rose-400 px-2 py-0.5 rounded-full border border-rose-100 dark:border-rose-500/20">{t(language, 'holiday')}</span>
                                    ) : (
                                      `${entry.eveningQuantity} L`
                                    )}
                                  </td>
                                  <td className="px-4 py-3 font-medium text-right whitespace-nowrap">₹{entry.totalAmount}</td>
                                </tr>
                              ))}
                            </Fragment>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
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
          )}
        </div>
      </DialogContent>

      <ConfirmDialog
        isOpen={!!monthToPay}
        onClose={() => setMonthToPay(null)}
        onConfirm={handlePayMonthBalance}
        isProcessing={isPayingMonth}
        title={t(language, 'payMonthBalanceTitle')}
        description={
          monthToPay
            ? `${monthToPay.label} - ₹${monthToPay.balance}`
            : t(language, 'payMonthBalanceDesc')
        }
        confirmText={isPayingMonth ? t(language, 'generating') : t(language, 'payMonthBalance')}
        cancelText={t(language, 'cancel')}
        isDestructive={false}
      />
    </Dialog>
  )
}
