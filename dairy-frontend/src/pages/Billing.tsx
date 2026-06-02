import { useState, useEffect, useMemo } from 'react'
import toast from 'react-hot-toast'
import { Download, MessageCircle, Calculator, Trash2, CheckCircle } from 'lucide-react'
import QRCode from 'qrcode'
import axios from 'axios'
import { Button } from '../components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { useSettingsStore } from '../store/settingsStore'
import { t } from '../utils/translations'
import { getDisplayLocale, toEnglishDigits } from '../utils/numberFormat'
import { fetchCustomersWithCache, invalidateCustomerCache } from '../lib/customerCache'
import { fetchAppSettings } from '../lib/userSettings'
import { LoadingBlock, LoadingInline, LoadingSpinner } from '../components/ui/loading'
import { getCachedViewData, setCachedViewData } from '../lib/viewCache'

interface Invoice {
  id: string
  customerId: string
  customerName: string
  periodStartDate: string
  periodEndDate: string
  invoiceMonth: number
  invoiceYear: number
  totalAmount: number
  paidAmount: number
  status: string
  skippedDates: string[]
}

interface Customer {
  id: string
  name: string
  active?: boolean
}

interface MilkEntryRow {
  date: string
  morningQuantity?: number
  eveningQuantity?: number
  totalAmount?: number
  normalizedDate: string
}

const BILLING_CACHE_KEY = 'view-cache-billing-invoices'
const BILLING_CACHE_TTL_MS = 60_000

export default function Billing() {
  const { language } = useSettingsStore()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [payingInvoiceId, setPayingInvoiceId] = useState<string | null>(null)
  const [deletingInvoiceId, setDeletingInvoiceId] = useState<string | null>(null)
  
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [markPaidConfirmId, setMarkPaidConfirmId] = useState<string | null>(null)
  const [selectedCustomer, setSelectedCustomer] = useState('')
  const [upiId, setUpiId] = useState('')
  const today = new Date()
  const formatLocalDate = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
  const [startDate, setStartDate] = useState(formatLocalDate(new Date(today.getFullYear(), today.getMonth(), 1)))
  const [endDate, setEndDate] = useState(formatLocalDate(new Date(today.getFullYear(), today.getMonth() + 1, 0)))
  const activeCustomers = useMemo(
    () => customers.filter((customer) => customer.active !== false),
    [customers]
  )

  const formatDisplayDate = (value?: string) =>
    value ? value.split('-').reverse().join('/') : '-'
  const normalizeApiDate = (value?: string) => (value ? value.slice(0, 10) : '')
  const parseDateInput = (value: string) => {
    const [year, month, day] = value.split('-').map(Number)
    return new Date(year, month - 1, day)
  }
  const getInvoiceRangeLabel = (invoice: Invoice) =>
    invoice.periodStartDate && invoice.periodEndDate
      ? `${formatDisplayDate(invoice.periodStartDate)} - ${formatDisplayDate(invoice.periodEndDate)}`
      : toEnglishDigits(`${new Intl.DateTimeFormat(getDisplayLocale(language), { month: 'short' }).format(new Date(0, invoice.invoiceMonth - 1))} ${invoice.invoiceYear}`)

  const getInvoicePeriodKey = (invoice: Invoice) =>
    `${invoice.customerId ?? ''}|${invoice.periodStartDate ?? ''}|${invoice.periodEndDate ?? ''}`

  const preferInvoice = (current: Invoice, candidate: Invoice) => {
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

  const uniqueInvoices = (rows: Invoice[]) => {
    const deduped = new Map<string, Invoice>()
    rows.forEach((invoice) => {
      const key = getInvoicePeriodKey(invoice)
      const existing = deduped.get(key)
      if (!existing) {
        deduped.set(key, invoice)
        return
      }
      deduped.set(key, preferInvoice(existing, invoice))
    })
    return Array.from(deduped.values())
  }

  const normalizeInvoices = (rows: unknown): Invoice[] => {
    if (!Array.isArray(rows)) {
      return []
    }

    return rows.filter((row): row is Invoice => {
      return !!row && typeof row === 'object' && 'id' in row
    })
  }

  useEffect(() => {
    const cachedInvoices = getCachedViewData<Invoice[]>(BILLING_CACHE_KEY, BILLING_CACHE_TTL_MS)
    if (cachedInvoices) {
      setInvoices(uniqueInvoices(normalizeInvoices(cachedInvoices)))
      setIsLoading(false)
      void Promise.all([fetchInvoices(), fetchCustomers(), fetchUpiSettings()])
      return
    }

    void loadInitialData()
  }, [])

  const loadInitialData = async () => {
    setIsLoading(true)
    try {
      await Promise.all([fetchInvoices(), fetchCustomers(), fetchUpiSettings()])
    } finally {
      setIsLoading(false)
    }
  }

  const fetchUpiSettings = async () => {
    try {
      const data = await fetchAppSettings()
      setUpiId(data.upiId || '')
    } catch (error) {
      console.error(error)
    }
  }

  const reconcileInvoiceTotal = async (invoice: Invoice, sourceInvoices: Invoice[]) => {
    if (invoice.status === 'PAID') {
      return invoice
    }

    if (!invoice.periodStartDate || !invoice.periodEndDate) {
      return invoice
    }

    try {
      const res = await axios.get(`/api/milk-entries/customer-range?customerId=${invoice.customerId}&startDate=${invoice.periodStartDate}&endDate=${invoice.periodEndDate}`)
      if (!res.data.success) {
        return invoice
      }

      const paidDates = getCoveredPaidDates(invoice, sourceInvoices)
      const totalAmount = (res.data.data ?? []).reduce((sum: number, entry: any) => {
        const normalizedDate = normalizeApiDate(entry.date)
        if (paidDates.has(normalizedDate)) {
          return sum
        }
        return sum + Number(entry.totalAmount || 0)
      }, 0)

      return {
        ...invoice,
        totalAmount,
      }
    } catch (error) {
      console.error('Failed to reconcile invoice total', error)
      return invoice
    }
  }

  const getCoveredPaidDates = (invoice: Invoice, sourceInvoices: Invoice[]) => {
    const coveredDates = new Set<string>()

    sourceInvoices.forEach((currentInvoice) => {
      if (
        currentInvoice.customerId !== invoice.customerId ||
        currentInvoice.id === invoice.id ||
        currentInvoice.status !== 'PAID' ||
        !currentInvoice.periodStartDate ||
        !currentInvoice.periodEndDate
      ) {
        return
      }

      const start = parseDateInput(currentInvoice.periodStartDate)
      const end = parseDateInput(currentInvoice.periodEndDate)
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        coveredDates.add(formatLocalDate(d))
      }
    })

    return coveredDates
  }

  const fetchInvoices = async () => {
    try {
      const res = await axios.get('/api/invoices')
      if (res.data.success) {
        const rawInvoices = normalizeInvoices(res.data.data)
        const reconciledInvoices = await Promise.all(rawInvoices.map((invoice) => reconcileInvoiceTotal(invoice, rawInvoices)))
        const sortedInvoices = uniqueInvoices(reconciledInvoices).sort((a: Invoice, b: Invoice) => {
          // ObjectIDs can be sorted chronologically
          return b.id.localeCompare(a.id);
        })
        setInvoices(sortedInvoices)
        setCachedViewData(BILLING_CACHE_KEY, sortedInvoices)
      }
    } catch (err) {
      console.error(err)
    }
  }

  const fetchCustomers = async () => {
    try {
      setCustomers(await fetchCustomersWithCache<Customer>())
    } catch (err) {
      console.error(err)
    }
  }

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSubmitting) return;
    if (!selectedCustomer) {
      alert(t(language, 'pleaseSelectCustomer'))
      return
    }
    if (!startDate || !endDate || startDate > endDate) {
      alert(t(language, 'validDateRange'))
      return
    }
    setIsSubmitting(true)
    try {
      const res = await axios.post(`/api/invoices/generate?customerId=${selectedCustomer}&startDate=${startDate}&endDate=${endDate}`)
      if (res.data.success) {
        invalidateCustomerCache()
        const generatedInvoice = normalizeInvoices([res.data.data])[0]
        const nextInvoices = generatedInvoice
          ? uniqueInvoices([generatedInvoice, ...invoices])
          : invoices
        setInvoices(nextInvoices)
        setCachedViewData(BILLING_CACHE_KEY, nextInvoices)
        setIsDialogOpen(false)
      }
    } catch (err) {
      console.error(err)
      alert(t(language, 'failedGenerateBill'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleMarkAsPaid = async (invoiceId: string) => {
    if (payingInvoiceId) return;
    setPayingInvoiceId(invoiceId)
    try {
      const res = await axios.put(`/api/invoices/${invoiceId}/pay`)
      if (res.data.success) {
        invalidateCustomerCache()
        await Promise.all([fetchInvoices(), fetchCustomers()])
        toast.success(t(language, 'invoiceMarkedPaid'))
      }
    } catch (err) {
      console.error(err)
      toast.error(t(language, 'failedMarkPaid'))
    } finally {
      setPayingInvoiceId(null)
    }
  }

  const handleDeleteInvoice = async () => {
    if (!deleteConfirmId || deletingInvoiceId) return;

    const invoiceId = deleteConfirmId;
    const previousInvoices = invoices;

    setDeletingInvoiceId(invoiceId)
    const nextInvoices = invoices.filter((invoice) => invoice.id !== invoiceId)
    setInvoices(nextInvoices);
    setCachedViewData(BILLING_CACHE_KEY, nextInvoices)
    setDeleteConfirmId(null);

    try {
      const res = await axios.delete(`/api/invoices/${invoiceId}`);
      if (!res.data.success) {
        setInvoices(previousInvoices);
        setCachedViewData(BILLING_CACHE_KEY, previousInvoices)
        toast.error(t(language, 'failedDeleteBill'));
      }
    } catch (err) {
      console.error(err);
      setInvoices(previousInvoices);
      setCachedViewData(BILLING_CACHE_KEY, previousInvoices)
      toast.error(t(language, 'failedDeleteBill'));
    } finally {
      setDeletingInvoiceId(null);
    }
  }

  const generatePDF = async (invoice: Invoice) => {
    const printWindow = window.open('', '', 'width=800,height=600');
    if (!printWindow) {
      alert(t(language, 'allowPopups'));
      return;
    }

    const rangeLabel = invoice.periodStartDate && invoice.periodEndDate
      ? `${formatDisplayDate(invoice.periodStartDate)} - ${formatDisplayDate(invoice.periodEndDate)}`
      : toEnglishDigits(`${new Intl.DateTimeFormat(getDisplayLocale(language), { month: 'long' }).format(new Date(0, invoice.invoiceMonth - 1))} ${invoice.invoiceYear}`)
    const formatDate = (value: string) => new Date(value).toLocaleDateString('en-GB')

    let totalLiters = 0
    let deliveredDays = 0
    let lineItemsHTML = ''
    let computedSkippedDates: string[] = []
    let computedTotalAmount = 0
    
    try {
      const res = await axios.get(`/api/milk-entries/customer-range?customerId=${invoice.customerId}&startDate=${invoice.periodStartDate}&endDate=${invoice.periodEndDate}`)
      if (res.data.success) {
        const entries: MilkEntryRow[] = (res.data.data ?? []).map((entry: any) => ({
          ...entry,
          normalizedDate: normalizeApiDate(entry.date),
        }))
        const paidDates = getCoveredPaidDates(invoice, invoices)
        entries.sort((a, b) => a.normalizedDate.localeCompare(b.normalizedDate))
        const entriesByDate = new Map<string, MilkEntryRow>(entries.map((entry) => [entry.normalizedDate, entry]))

        const startDate = parseDateInput(invoice.periodStartDate)
        const endDate = parseDateInput(invoice.periodEndDate)
        const todayDate = new Date()
        const actualEndDate = endDate > todayDate ? todayDate : endDate

        const allDays = [];
        for (let d = new Date(startDate); d <= actualEndDate; d.setDate(d.getDate() + 1)) {
          allDays.push(formatLocalDate(d));
        }

        allDays.forEach((dateStr, index) => {
          const entry = entriesByDate.get(dateStr)
          if (entry) {
            const morning = Number(entry.morningQuantity || 0)
            const evening = Number(entry.eveningQuantity || 0)
            const liters = morning + evening
            const isPaidDate = paidDates.has(dateStr)
            if (!isPaidDate) {
              totalLiters += liters
              deliveredDays += 1
              computedTotalAmount += Number(entry.totalAmount || 0)
            }
            lineItemsHTML += `
              <tr${isPaidDate ? ' style="background-color: #f8fafc; color: #64748b;"' : ''}>
                <td>${index + 1}</td>
                <td>${formatDate(entry.date)}</td>
                <td>${morning > 0 ? morning + ' L' : '-'}</td>
                <td>${evening > 0 ? evening + ' L' : '-'}</td>
                <td>${liters.toFixed(1)} L</td>
                <td style="text-align: right;">${isPaidDate ? t(language, 'paid') : `₹${Number(entry.totalAmount || 0).toFixed(2)}`}</td>
              </tr>
            `;
          } else {
            computedSkippedDates.push(dateStr)
            lineItemsHTML += `
              <tr style="background-color: #f8fafc; color: #64748b;">
                <td>${index + 1}</td>
                <td>${formatDate(dateStr)}</td>
                <td>-</td>
                <td>-</td>
                <td>0.0 L</td>
                <td style="text-align: right;">${t(language, 'noDeliveryBill')}</td>
              </tr>
            `;
          }
        });
      }
    } catch (err) {
      console.error("Failed to fetch detailed entries for bill", err)
    }

    if (!computedTotalAmount && Number(invoice.totalAmount || 0) > 0) {
      computedTotalAmount = Number(invoice.totalAmount || 0)
    }

    // Generate QR
    let qrHtml = '';
    try {
      if (!upiId) {
          throw new Error(t(language, 'upiIdMissing'))
      }
      const payableAmount = computedTotalAmount || Number(invoice.totalAmount || 0)
      const upiString = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(t(language, 'dairyName'))}&am=${payableAmount}&cu=INR`
      const qrDataUrl = await QRCode.toDataURL(upiString, { 
        width: 150, 
        margin: 1,
        color: { dark: '#0F172A', light: '#FFFFFF' }
      })
      qrHtml = `
        <div style="margin-top: 30px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; display: flex; align-items: center; gap: 20px;">
          <img src="${qrDataUrl}" style="width: 120px; height: 120px;" />
          <div>
            <h3 style="margin: 0 0 5px 0; font-size: 18px; color: #0f172a;">${t(language, 'payViaUpi')}</h3>
            <p style="margin: 0 0 5px 0; color: #64748b; font-size: 14px;">${t(language, 'scanQrMsg')}</p>
            <p style="margin: 0 0 5px 0; color: #64748b; font-size: 13px;">${upiId}</p>
            <p style="margin: 0; color: #64748b; font-size: 14px;">${t(language, 'thankYou')}</p>
          </div>
        </div>
      `;
    } catch (err) {
      console.error(err);
    }

    const skippedDatesNote = computedSkippedDates.length > 0 
      ? `<div style="margin-top: 15px; color: #b45309; font-size: 13px;">${t(language, 'noDeliveryBill')}: ${computedSkippedDates.map(formatDate).join(', ')}</div>`
      : '';

    const logoUrl = window.location.origin + '/logo.png';

    const html = `
      <!DOCTYPE html>
      <html lang="${language}">
      <head>
        <meta charset="UTF-8">
        <title>Bill_${invoice.customerName}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;600;700&display=swap');
          body {
            font-family: 'Noto Sans Devanagari', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #0f172a;
            line-height: 1.5;
            padding: 40px;
            max-width: 800px;
            margin: 0 auto;
            position: relative;
            z-index: 1;
          }
          .watermark-container {
            position: fixed;
            top: 0;
            bottom: 0;
            left: 0;
            right: 0;
            display: flex;
            justify-content: center;
            align-items: center;
            pointer-events: none;
          }
          .watermark-img {
            width: 70%;
            max-width: 500px;
            opacity: 0.06;
            object-fit: contain;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #e2e8f0;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .header-left { display: flex; align-items: center; gap: 15px; }
          .header-left-text h1 { margin: 0; font-size: 28px; color: #1e293b; }
          .header-left-text p { margin: 5px 0 0 0; color: #64748b; font-size: 14px; }
          .header-right { text-align: right; }
          .header-right h2 { margin: 0; font-size: 20px; color: #111; }
          .header-right p { margin: 5px 0 0 0; font-weight: 600; }
          
          .info-box {
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 30px;
            display: flex;
            justify-content: space-between;
          }
          .info-item p { margin: 0; color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
          .info-item h3 { margin: 5px 0 0 0; font-size: 18px; }
          
          table { width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 14px; }
          th { background-color: #f1f5f9; color: #475569; font-weight: 600; text-align: left; padding: 12px; border-bottom: 2px solid #cbd5e1; }
          td { padding: 12px; border-bottom: 1px solid #e2e8f0; }
          tr:nth-child(even) { background-color: #f8fafc; }
          
          .summary-box {
            background-color: #eff6ff;
            border: 1px solid #bfdbfe;
            border-radius: 8px;
            padding: 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .summary-stats { display: flex; gap: 30px; color: #1d4ed8; }
          .summary-stats div span { display: block; font-size: 12px; color: #111; text-transform: uppercase; }
          .summary-stats div strong { font-size: 16px; }
          .summary-total { text-align: right; }
          .summary-total span { display: block; font-size: 12px; color: #111; text-transform: uppercase; }
          .summary-total strong { font-size: 24px; color: #1e40af; }
          
          @media print {
            body { padding: 0; }
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="watermark-container">
          <img src="${logoUrl}" class="watermark-img" alt="Watermark" />
        </div>
        <div class="header">
          <div class="header-left">
            <img src="${logoUrl}" alt="Logo" style="width: 60px; height: 60px; object-fit: contain;" />
            <div class="header-left-text">
              <h1>${t(language, 'dairyName')}</h1>
              <p>${t(language, 'milkBillStatement')}</p>
            </div>
          </div>
          <div class="header-right">
            <h2>₹${(computedTotalAmount || Number(invoice.totalAmount || 0)).toFixed(2)}</h2>
            <p>${rangeLabel}</p>
          </div>
        </div>
        
        <div class="info-box">
          <div class="info-item">
            <p>${t(language, 'customer')}</p>
            <h3>${invoice.customerName}</h3>
          </div>
          <div class="info-item" style="text-align: right;">
            <p>${t(language, 'billingRange')}</p>
            <h3>${rangeLabel}</h3>
          </div>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>${t(language, 'dateBill')}</th>
              <th>${t(language, 'morningBill')}</th>
              <th>${t(language, 'eveningBill')}</th>
              <th>${t(language, 'totalBill')}</th>
              <th style="text-align: right;">${t(language, 'amountBill')}</th>
            </tr>
          </thead>
          <tbody>
            ${lineItemsHTML}
          </tbody>
        </table>
        
        <div class="summary-box">
          <div class="summary-stats">
            <div><span>${t(language, 'deliveredDays')}</span><strong>${deliveredDays}</strong></div>
            <div><span>${t(language, 'skippedDays')}</span><strong>${computedSkippedDates.length}</strong></div>
            <div><span>${t(language, 'totalLitersBill')}</span><strong>${totalLiters.toFixed(1)} L</strong></div>
          </div>
          <div class="summary-total">
            <span>${t(language, 'totalBill')}</span>
            <strong>₹${(computedTotalAmount || Number(invoice.totalAmount || 0)).toFixed(2)}</strong>
          </div>
        </div>
        
        ${skippedDatesNote}
        
        ${qrHtml}
        
        <div style="text-align: center; margin-top: 40px;">
          <button onclick="window.print()" style="background-color: #111; color: white; border: none; padding: 10px 20px; font-size: 16px; border-radius: 6px; cursor: pointer; font-family: inherit;">${t(language, 'printSavePdf')}</button>
        </div>
        <script>
          setTimeout(() => { window.print(); }, 1000);
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-800 dark:text-white">{t(language, 'billingTitle')}</h1>
          <p className="text-slate-500 dark:text-slate-300 font-medium mt-1">{t(language, 'billingDesc')}</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 rounded-xl shadow-md dark:bg-white dark:text-black dark:hover:bg-zinc-200 dark:shadow-none">
              <Calculator className="w-4 h-4" />
              {t(language, 'generateBill')}
            </Button>
          </DialogTrigger>
          <DialogContent className="dark:border-zinc-700 dark:bg-[#101010]">
            <DialogHeader>
              <DialogTitle>{t(language, 'generateBill')}</DialogTitle>
              <DialogDescription>
                {t(language, 'generateBillDesc')}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleGenerate} className="mt-4 space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">{t(language, 'customer')}</label>
                <select 
                  required
                  value={selectedCustomer}
                  onChange={e => setSelectedCustomer(e.target.value)}
                  className="w-full rounded-[1.4rem] border border-white/60 bg-white/45 px-4 py-3.5 text-slate-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-slate-500 dark:border-zinc-700 dark:bg-[#111111] dark:text-white dark:focus:ring-white/30"
                >
                  <option value="" disabled>{t(language, 'selectCustomerPlaceholder')}</option>
                  {activeCustomers.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">{t(language, 'fromDate')}</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="w-full rounded-[1.4rem] border border-white/60 bg-white/45 px-4 pr-11 py-3.5 text-[15px] text-slate-800 [font-variant-numeric:tabular-nums] shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-slate-500 sm:text-base dark:border-zinc-700 dark:bg-[#111111] dark:text-white dark:focus:ring-white/30"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">{t(language, 'toDate')}</label>
                  <input 
                    type="date" value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="w-full rounded-[1.4rem] border border-white/60 bg-white/45 px-4 pr-11 py-3.5 text-[15px] text-slate-800 [font-variant-numeric:tabular-nums] shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-slate-500 sm:text-base dark:border-zinc-700 dark:bg-[#111111] dark:text-white dark:focus:ring-white/30"
                  />
                </div>
              </div>
              <Button type="submit" disabled={isSubmitting} className="mt-2 h-14 w-full rounded-[1.6rem] shadow-[0_12px_30px_rgba(139,92,246,0.28)] dark:bg-white dark:text-black dark:shadow-none dark:hover:bg-zinc-200">
                {isSubmitting ? <LoadingInline label={t(language, 'generating')} /> : t(language, 'generateBill')}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-white/40 dark:bg-[#101010] backdrop-blur-xl rounded-[2rem] border border-white/60 dark:border-zinc-700/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-4 sm:p-8">
        <div className="overflow-x-auto">
          {isLoading ? (
            <LoadingBlock label={t(language, 'loadingBills')} minHeightClassName="min-h-[240px]" size="md" />
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200/60 dark:border-zinc-700 text-slate-500 dark:text-slate-300 text-sm">
                  <th className="pb-3 px-4 font-medium whitespace-nowrap">{t(language, 'customer')}</th>
                  <th className="pb-3 px-4 font-medium whitespace-nowrap">{t(language, 'billingPeriod')}</th>
                  <th className="pb-3 px-4 font-medium whitespace-nowrap">{t(language, 'totalValue')}</th>
                  <th className="pb-3 px-4 font-medium whitespace-nowrap">{t(language, 'status')}</th>
                  <th className="pb-3 px-4 font-medium text-right whitespace-nowrap">{t(language, 'actions')}</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {invoices.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500 dark:text-slate-300">{t(language, 'noBills')}</td>
                  </tr>
                ) : (
                  invoices.map((inv) => (
                    <tr key={inv.id} className="border-b border-slate-100 dark:border-zinc-800/50 last:border-0 hover:bg-slate-50/50 dark:hover:bg-zinc-900/50 transition-colors">
                      <td className="py-4 px-4 whitespace-nowrap">
                        <span className="font-medium text-slate-800 dark:text-slate-200">{inv.customerName}</span>
                      </td>
                      <td className="py-4 px-4 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {getInvoiceRangeLabel(inv)}
                      </td>
                      <td className="py-4 px-4 font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">₹{inv.totalAmount}</td>
                      <td className="py-4 px-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                          inv.status === 'PAID' ? 'bg-slate-100 text-slate-700 dark:bg-white dark:text-black' : 'bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-white'
                        }`}>
                          {inv.status === 'PAID' ? t(language, 'paid') : t(language, 'pending')}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right flex justify-end gap-2 whitespace-nowrap">
                        {inv.status !== 'PAID' && (
                          <Button 
                            variant="outline" size="icon" 
                            disabled={payingInvoiceId === inv.id}
                            className="h-8 w-8 text-slate-700 rounded-lg border-slate-200 hover:bg-slate-50 disabled:opacity-50 dark:text-white dark:border-zinc-700 dark:hover:bg-zinc-800"
                            title={t(language, 'markAsPaid')}
                            onClick={() => setMarkPaidConfirmId(inv.id)}
                          >
                            {payingInvoiceId === inv.id ? <LoadingSpinner size="sm" className="text-current" /> : <CheckCircle className="w-4 h-4" />}
                          </Button>
                        )}
                        <Button 
                          variant="outline" size="icon" 
                          className="h-8 w-8 text-slate-700 rounded-lg border-slate-200 hover:bg-slate-50 dark:text-white dark:border-zinc-700 dark:hover:bg-zinc-800"
                          title={t(language, 'downloadBill')}
                          onClick={() => generatePDF(inv)}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="outline" size="icon" 
                          className="h-8 w-8 text-slate-700 rounded-lg border-slate-200 hover:bg-slate-50 dark:text-white dark:border-zinc-700 dark:hover:bg-zinc-800"
                          title={t(language, 'sendViaWhatsapp')}
                          onClick={() => {
                            if (!upiId) {
                              alert(t(language, 'upiIdMissing'))
                              return
                            }
                            const upiString = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=Gharcha%20Dudh&am=${inv.totalAmount}&cu=INR`;
                            const encodedUpi = encodeURIComponent(upiString);
                            const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodedUpi}`;
                            const skippedNote = inv.skippedDates?.length
                              ? `%0A${t(language, 'noMilkOn')}: ${inv.skippedDates.join(', ')}`
                              : '';
                            
                            const greeting = language === 'mr' ? `नमस्कार ${inv.customerName},` : `Hello ${inv.customerName},`
                            const text = `${greeting}%0A%0A${t(language, 'billStatusMessage')}%0A${t(language, 'billingPeriod')}: ${getInvoiceRangeLabel(inv)}%0A${t(language, 'amountBill')}: ₹${inv.totalAmount}%0A${t(language, 'status')}: ${inv.status === 'PAID' ? t(language, 'paid') : t(language, 'pending')}${skippedNote}%0A%0A${t(language, 'payInstantly')}%0A${upiString}%0A%0A${t(language, 'orScanQr')}%0A${qrUrl}%0A%0A- ${t(language, 'dairyName')}`;
                            window.open(`https://wa.me/?text=${text}`, '_blank');
                          }}
                        >
                          <MessageCircle className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="outline" size="icon" 
                          className="h-8 w-8 text-slate-700 rounded-lg border-slate-200 hover:bg-slate-50 dark:text-white dark:border-zinc-700 dark:hover:bg-zinc-800"
                          title={t(language, 'deleteBill')}
                          onClick={() => setDeleteConfirmId(inv.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
        
        <ConfirmDialog
          isOpen={!!markPaidConfirmId}
          onClose={() => setMarkPaidConfirmId(null)}
          onConfirm={async () => {
            if (!markPaidConfirmId) return
            await handleMarkAsPaid(markPaidConfirmId)
            setMarkPaidConfirmId(null)
          }}
          isProcessing={!!payingInvoiceId}
          title={t(language, 'confirmPayment')}
          description={t(language, 'confirmPaidDesc')}
          confirmText={t(language, 'yesMarkPaid')}
          cancelText={t(language, 'cancel')}
        />

        <ConfirmDialog 
          isOpen={!!deleteConfirmId}
          onClose={() => setDeleteConfirmId(null)}
          onConfirm={handleDeleteInvoice}
          isProcessing={!!deletingInvoiceId}
          title={t(language, 'confirmDeletionTitle')}
          description={t(language, 'deleteConfirm')}
          confirmText={t(language, 'delete')}
          cancelText={t(language, 'cancel')}
        />
      </div>
    </div>
  )
}
