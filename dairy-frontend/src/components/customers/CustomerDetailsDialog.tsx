import { useState, useEffect, useMemo } from 'react'
import axios from 'axios'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog'
import { LoadingBlock } from '../ui/loading'
import { useSettingsStore } from '../../store/settingsStore'
import { t } from '../../utils/translations'
import { getDisplayLocale } from '../../utils/numberFormat'

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
  status: string
}

interface CustomerDetailsDialogProps {
  customer: Customer | null
  isOpen: boolean
  onClose: () => void
}

export function CustomerDetailsDialog({ customer, isOpen, onClose }: CustomerDetailsDialogProps) {
  const { language } = useSettingsStore()
  const [activeTab, setActiveTab] = useState<'info' | 'entries' | 'holidays' | 'invoices' | 'payments'>('info')
  const [entries, setEntries] = useState<MilkEntry[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [entriesLoading, setEntriesLoading] = useState(false)
  const [entryFilterType, setEntryFilterType] = useState<'all' | 'single' | 'range'>('all')

  const [entryStartDate, setEntryStartDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
  })
  const [entryEndDate, setEntryEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  })

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
        end = entryStartDate;
      }
      
      fetchCustomerEntries(customer.id, start, end)
    }
  }, [isOpen, customer, entryStartDate, entryEndDate, entryFilterType])

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

  const fetchCustomerData = async (customerId: string) => {
    setIsLoading(true)
    try {
      // Fetch invoices and payments (entries are handled by the other useEffect)
      const [invoicesRes, paymentsRes] = await Promise.all([
        axios.get('/api/invoices'),
        axios.get('/api/payments')
      ])

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
        return skippedDate === entryStartDate
      }

      if (entryFilterType === 'range') {
        return skippedDate >= entryStartDate && skippedDate <= entryEndDate
      }

      return true
    })
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
  }, [customer, entries, entryEndDate, entryFilterType, entryStartDate])

  if (!customer) return null

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-4 sm:px-6 pt-5 sm:pt-6 pb-2 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-xl dark:bg-primary-900 dark:text-primary-300">
              {customer.name.charAt(0)}
            </div>
            <div>
              <DialogTitle className="text-xl sm:text-2xl font-bold">{customer.name}</DialogTitle>
              <DialogDescription className="sr-only">Detailed customer information and history.</DialogDescription>
              <div className="text-sm text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
                <span>{customer.phone || 'No phone'}</span>
                <span>•</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${customer.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-700'}`}>
                  {customer.active ? t(language, 'active') : t(language, 'inactive')}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex gap-4 mt-4 sm:mt-6 overflow-x-auto no-scrollbar pb-1">
            {[
              { id: 'info', label: 'Overview' },
              { id: 'entries', label: `Entries (${entries.length})` },
              { id: 'holidays', label: `${language === 'mr' ? 'सुट्टी' : 'Holidays'} (${filteredSkippedDates.length})` },
              { id: 'invoices', label: `Bills (${invoices.length})` },
              { id: 'payments', label: `Payments (${payments.length})` }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`pb-3 text-sm font-semibold whitespace-nowrap transition-colors border-b-2 ${
                  activeTab === tab.id 
                    ? 'border-primary-600 text-primary-600 dark:border-primary-400 dark:text-primary-400' 
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
            <LoadingBlock label="Loading details..." minHeightClassName="min-h-[200px]" size="md" />
          ) : (
            <>
              {activeTab === 'info' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-200 dark:border-slate-700">
                    <h3 className="font-semibold text-slate-700 dark:text-slate-200 mb-4">Customer Details</h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Address</span>
                        <span className="font-medium text-right text-slate-800 dark:text-slate-200">{customer.address || '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Milk Type</span>
                        <span className="font-medium text-slate-800 dark:text-slate-200">{getMilkTypeLabel(customer.milkType)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Daily Quantity</span>
                        <span className="font-medium text-slate-800 dark:text-slate-200">{customer.dailyQuantity} L</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Rate / Liter</span>
                        <span className="font-medium text-slate-800 dark:text-slate-200">₹{customer.ratePerLiter}</span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-200 dark:border-slate-700">
                    <h3 className="font-semibold text-slate-700 dark:text-slate-200 mb-4">Financial Overview</h3>
                    <div className="flex flex-col items-center justify-center h-24 bg-slate-50 dark:bg-slate-900 rounded-xl mb-4">
                      <span className="text-sm font-medium text-slate-500">Current Balance</span>
                      <span className={`text-3xl font-extrabold ${customer.balance > 0 ? 'text-emerald-600' : customer.balance < 0 ? 'text-red-500' : 'text-slate-700 dark:text-slate-200'}`}>
                        ₹{customer.balance}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'entries' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row gap-3 items-end px-1">
                    <div className="w-full sm:w-1/3">
                      <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">{t(language, 'filterEntries') || 'Filter Entries'}</label>
                      <select
                        value={entryFilterType}
                        onChange={(e) => setEntryFilterType(e.target.value as any)}
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 shadow-sm"
                      >
                        <option value="all">{t(language, 'allEntries') || 'All Entries'}</option>
                        <option value="single">{t(language, 'specificDate') || 'Specific Date'}</option>
                        <option value="range">{t(language, 'dateRange') || 'Date Range'}</option>
                      </select>
                    </div>

                    {entryFilterType === 'range' && (
                      <>
                        <div className="w-full sm:w-1/3">
                          <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">{t(language, 'fromDate') || 'From Date'}</label>
                          <input 
                            type="date" 
                            value={entryStartDate}
                            onChange={e => setEntryStartDate(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 shadow-sm"
                          />
                        </div>
                        <div className="w-full sm:w-1/3">
                          <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">{t(language, 'toDate') || 'To Date'}</label>
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
                        <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">{t(language, 'dateLabel') || 'Date'}</label>
                        <input 
                          type="date" 
                          value={entryStartDate}
                          onChange={e => setEntryStartDate(e.target.value)}
                          className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 shadow-sm"
                        />
                      </div>
                    )}
                  </div>
                  
                  <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden relative">
                    {entriesLoading && (
                      <div className="absolute inset-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm z-10 flex items-center justify-center">
                        <LoadingBlock label="Loading..." size="sm" />
                      </div>
                    )}
                    <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                        <tr>
                          <th className="px-4 py-3 font-medium text-slate-500 whitespace-nowrap">Date</th>
                          <th className="px-4 py-3 font-medium text-slate-500 whitespace-nowrap">Morning</th>
                          <th className="px-4 py-3 font-medium text-slate-500 whitespace-nowrap">Evening</th>
                          <th className="px-4 py-3 font-medium text-right text-slate-500 whitespace-nowrap">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {entries.length === 0 ? (
                          <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-500">No entries this month.</td></tr>
                        ) : (
                          entries.map(entry => (
                            <tr key={entry.id} className="border-b border-slate-100 dark:border-slate-700/50 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                              <td className="px-4 py-3 whitespace-nowrap">{formatDate(entry.date)}</td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                {(!entry.morningQuantity || entry.morningQuantity === 0) ? (
                                  <span className="text-[10px] font-bold text-rose-600 bg-rose-50 dark:bg-rose-500/10 dark:text-rose-400 px-2 py-0.5 rounded-full border border-rose-100 dark:border-rose-500/20">{language === 'mr' ? 'सुट्टी' : 'Holiday'}</span>
                                ) : (
                                  `${entry.morningQuantity} L`
                                )}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                {(!entry.eveningQuantity || entry.eveningQuantity === 0) ? (
                                  <span className="text-[10px] font-bold text-rose-600 bg-rose-50 dark:bg-rose-500/10 dark:text-rose-400 px-2 py-0.5 rounded-full border border-rose-100 dark:border-rose-500/20">{language === 'mr' ? 'सुट्टी' : 'Holiday'}</span>
                                ) : (
                                  `${entry.eveningQuantity} L`
                                )}
                              </td>
                              <td className="px-4 py-3 font-medium text-right whitespace-nowrap">₹{entry.totalAmount}</td>
                            </tr>
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
                      <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">{t(language, 'filterEntries') || 'Filter Entries'}</label>
                      <select
                        value={entryFilterType}
                        onChange={(e) => setEntryFilterType(e.target.value as any)}
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 shadow-sm"
                      >
                        <option value="all">{t(language, 'allEntries') || 'All Entries'}</option>
                        <option value="single">{t(language, 'specificDate') || 'Specific Date'}</option>
                        <option value="range">{t(language, 'dateRange') || 'Date Range'}</option>
                      </select>
                    </div>

                    {entryFilterType === 'range' && (
                      <>
                        <div className="w-full sm:w-1/3">
                          <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">{t(language, 'fromDate') || 'From Date'}</label>
                          <input
                            type="date"
                            value={entryStartDate}
                            onChange={e => setEntryStartDate(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 shadow-sm"
                          />
                        </div>
                        <div className="w-full sm:w-1/3">
                          <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">{t(language, 'toDate') || 'To Date'}</label>
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
                        <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">{t(language, 'dateLabel') || 'Date'}</label>
                        <input
                          type="date"
                          value={entryStartDate}
                          onChange={e => setEntryStartDate(e.target.value)}
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
                            <th className="px-4 py-3 font-medium text-slate-500 whitespace-nowrap">Date</th>
                            <th className="px-4 py-3 font-medium text-slate-500 whitespace-nowrap">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredSkippedDates.length === 0 ? (
                            <tr><td colSpan={2} className="px-4 py-8 text-center text-slate-500">{language === 'mr' ? 'सुट्टी आढळली नाही.' : 'No holidays found.'}</td></tr>
                          ) : (
                            filteredSkippedDates.map((holidayDate) => (
                              <tr key={holidayDate} className="border-b border-slate-100 dark:border-slate-700/50 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                                <td className="px-4 py-3 whitespace-nowrap">{formatDate(holidayDate)}</td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <span className="text-[10px] font-bold text-rose-600 bg-rose-50 dark:bg-rose-500/10 dark:text-rose-400 px-2 py-0.5 rounded-full border border-rose-100 dark:border-rose-500/20">
                                    {language === 'mr' ? 'सुट्टी' : 'Holiday'}
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
                          <th className="px-4 py-3 font-medium text-slate-500 whitespace-nowrap">Period</th>
                          <th className="px-4 py-3 font-medium text-slate-500 whitespace-nowrap">Status</th>
                          <th className="px-4 py-3 font-medium text-right text-slate-500 whitespace-nowrap">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {invoices.length === 0 ? (
                          <tr><td colSpan={3} className="px-4 py-8 text-center text-slate-500">No bills found.</td></tr>
                        ) : (
                          invoices.map(invoice => (
                            <tr key={invoice.id} className="border-b border-slate-100 dark:border-slate-700/50 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                              <td className="px-4 py-3 whitespace-nowrap">{formatDate(invoice.periodStartDate)} - {formatDate(invoice.periodEndDate)}</td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span className={`px-2 py-1 rounded-md text-xs font-semibold ${
                                  invoice.status === 'PAID' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                                }`}>
                                  {invoice.status}
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
                          <th className="px-4 py-3 font-medium text-slate-500 whitespace-nowrap">Date</th>
                          <th className="px-4 py-3 font-medium text-slate-500 whitespace-nowrap">Status</th>
                          <th className="px-4 py-3 font-medium text-right text-slate-500 whitespace-nowrap">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {payments.length === 0 ? (
                          <tr><td colSpan={3} className="px-4 py-8 text-center text-slate-500">No payments found.</td></tr>
                        ) : (
                          payments.map(payment => (
                            <tr key={payment.id} className="border-b border-slate-100 dark:border-slate-700/50 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                              <td className="px-4 py-3 whitespace-nowrap">{formatDate(payment.paymentDate)}</td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span className={`px-2 py-1 rounded-md text-xs font-semibold ${
                                  payment.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'
                                }`}>
                                  {payment.status}
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
    </Dialog>
  )
}
