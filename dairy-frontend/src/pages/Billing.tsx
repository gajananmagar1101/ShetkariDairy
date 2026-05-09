import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { Download, MessageCircle, Calculator, Loader2, Trash2, CheckCircle } from 'lucide-react'
import QRCode from 'qrcode'
import axios from 'axios'
import { Button } from '../components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { useSettingsStore } from '../store/settingsStore'
import { t } from '../utils/translations'

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
}

export default function Billing() {
  const { language } = useSettingsStore()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [payingInvoiceId, setPayingInvoiceId] = useState<string | null>(null)
  
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [selectedCustomer, setSelectedCustomer] = useState('')
  const today = new Date()
  const [startDate, setStartDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0])
  const [endDate, setEndDate] = useState(new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0])

  const formatDisplayDate = (value?: string) =>
    value ? new Date(value).toLocaleDateString('en-GB') : 'N/A'
  const getInvoiceRangeLabel = (invoice: Invoice) =>
    invoice.periodStartDate && invoice.periodEndDate
      ? `${formatDisplayDate(invoice.periodStartDate)} - ${formatDisplayDate(invoice.periodEndDate)}`
      : `${new Date(0, invoice.invoiceMonth - 1).toLocaleString('default', { month: 'short' })} ${invoice.invoiceYear}`

  useEffect(() => {
    fetchInvoices()
    fetchCustomers()
  }, [])

  const fetchInvoices = async () => {
    try {
      const res = await axios.get('/api/invoices')
      if (res.data.success) {
        setInvoices(res.data.data.sort((a: Invoice, b: Invoice) => {
          // ObjectIDs can be sorted chronologically
          return b.id.localeCompare(a.id);
        }))
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchCustomers = async () => {
    try {
      const res = await axios.get('/api/customers')
      if (res.data.success) {
        setCustomers(res.data.data)
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSubmitting) return;
    setIsSubmitting(true)
    if (!selectedCustomer) {
      alert("Please select a customer")
      return
    }
    if (!startDate || !endDate || startDate > endDate) {
      alert("Please select a valid date range")
      return
    }
    try {
      const res = await axios.post(`/api/invoices/generate?customerId=${selectedCustomer}&startDate=${startDate}&endDate=${endDate}`)
      if (res.data.success) {
        setInvoices([res.data.data, ...invoices])
        setIsDialogOpen(false)
      }
    } catch (err) {
      console.error(err)
      alert("Failed to generate bill")
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
        setInvoices(invoices.map(inv => inv.id === invoiceId ? { ...inv, status: 'PAID' } : inv))
        toast.success('Invoice marked as paid and added to payments!')
      }
    } catch (err) {
      console.error(err)
      toast.error("Failed to mark as paid")
    } finally {
      setPayingInvoiceId(null)
    }
  }

  const handleDeleteInvoice = async () => {
    if (!deleteConfirmId) return;
    try {
      const res = await axios.delete(`/api/invoices/${deleteConfirmId}`);
      if (res.data.success) {
        setInvoices(invoices.filter(inv => inv.id !== deleteConfirmId));
      }
    } catch (err) {
      console.error(err);
      alert("Failed to delete bill.");
    } finally {
      setDeleteConfirmId(null);
    }
  }

  const generatePDF = async (invoice: Invoice) => {
    const printWindow = window.open('', '', 'width=800,height=600');
    if (!printWindow) {
      alert("Please allow popups to generate the bill.");
      return;
    }

    const rangeLabel = invoice.periodStartDate && invoice.periodEndDate
      ? `${formatDisplayDate(invoice.periodStartDate)} - ${formatDisplayDate(invoice.periodEndDate)}`
      : `${new Date(0, invoice.invoiceMonth - 1).toLocaleString('default', { month: 'long' })} ${invoice.invoiceYear}`
    const formatDate = (value: string) => new Date(value).toLocaleDateString('en-GB')

    let totalLiters = 0
    let deliveredDays = 0
    let lineItemsHTML = ''
    let computedSkippedDates: string[] = []
    
    try {
      const res = await axios.get(`/api/milk-entries/customer-range?customerId=${invoice.customerId}&startDate=${invoice.periodStartDate}&endDate=${invoice.periodEndDate}`)
      if (res.data.success) {
        const entries = res.data.data ?? []
        entries.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())

        const startDate = new Date(invoice.periodStartDate)
        const endDate = new Date(invoice.periodEndDate)
        const todayDate = new Date()
        const actualEndDate = endDate > todayDate ? todayDate : endDate

        const allDays = [];
        for (let d = new Date(startDate); d <= actualEndDate; d.setDate(d.getDate() + 1)) {
          allDays.push(d.toISOString().split('T')[0]);
        }

        allDays.forEach((dateStr, index) => {
          const entry = entries.find((e: any) => e.date === dateStr);
          if (entry) {
            const morning = Number(entry.morningQuantity || 0)
            const evening = Number(entry.eveningQuantity || 0)
            const liters = morning + evening
            totalLiters += liters
            deliveredDays += 1
            lineItemsHTML += `
              <tr>
                <td>${index + 1}</td>
                <td>${formatDate(entry.date)}</td>
                <td>${morning > 0 ? morning + ' L' : '-'}</td>
                <td>${evening > 0 ? evening + ' L' : '-'}</td>
                <td>${liters.toFixed(1)} L</td>
                <td style="text-align: right;">₹${Number(entry.totalAmount || 0).toFixed(2)}</td>
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

    // Generate QR
    let qrHtml = '';
    try {
      const upiId = "8149101048-2@ybl"
      const upiString = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(t(language, 'dairyName'))}&am=${invoice.totalAmount}&cu=INR`
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
          .header-right h2 { margin: 0; font-size: 20px; color: #3b82f6; }
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
          .summary-stats div span { display: block; font-size: 12px; color: #3b82f6; text-transform: uppercase; }
          .summary-stats div strong { font-size: 16px; }
          .summary-total { text-align: right; }
          .summary-total span { display: block; font-size: 12px; color: #3b82f6; text-transform: uppercase; }
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
            <h2>₹${Number(invoice.totalAmount).toFixed(2)}</h2>
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
            <strong>₹${Number(invoice.totalAmount).toFixed(2)}</strong>
          </div>
        </div>
        
        ${skippedDatesNote}
        
        ${qrHtml}
        
        <div style="text-align: center; margin-top: 40px;">
          <button onclick="window.print()" style="background-color: #3b82f6; color: white; border: none; padding: 10px 20px; font-size: 16px; border-radius: 6px; cursor: pointer; font-family: inherit;">Print / Save as PDF</button>
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
            <Button className="gap-2 rounded-xl shadow-md">
              <Calculator className="w-4 h-4" />
              {t(language, 'generateBill')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t(language, 'generateBill')}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleGenerate} className="mt-4 space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">{t(language, 'customer')}</label>
                <select 
                  required
                  value={selectedCustomer}
                  onChange={e => setSelectedCustomer(e.target.value)}
                  className="w-full rounded-[1.4rem] border border-white/60 bg-white/45 px-4 py-3.5 text-slate-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-primary-500/40"
                >
                  <option value="" disabled>Select Customer</option>
                  {customers.map(c => (
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
                    className="w-full rounded-[1.4rem] border border-white/60 bg-white/45 px-4 pr-11 py-3.5 text-[15px] text-slate-800 [font-variant-numeric:tabular-nums] shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-primary-500/40 sm:text-base"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">{t(language, 'toDate')}</label>
                  <input 
                    type="date" value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="w-full rounded-[1.4rem] border border-white/60 bg-white/45 px-4 pr-11 py-3.5 text-[15px] text-slate-800 [font-variant-numeric:tabular-nums] shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-primary-500/40 sm:text-base"
                  />
                </div>
              </div>
              <Button type="submit" disabled={isSubmitting} className="mt-2 h-14 w-full rounded-[1.6rem] shadow-[0_12px_30px_rgba(139,92,246,0.28)]">
                {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</> : t(language, 'generateBill')}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-white/40 dark:bg-slate-900/60 backdrop-blur-xl rounded-[2rem] border border-white/60 dark:border-slate-700/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-4 sm:p-8">
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200/60 dark:border-slate-600 text-slate-500 dark:text-slate-300 text-sm">
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
                    <tr key={inv.id} className="border-b border-slate-100 dark:border-slate-800/50 last:border-0 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-4 px-4 whitespace-nowrap">
                        <span className="font-medium text-slate-800 dark:text-slate-200">{inv.customerName}</span>
                      </td>
                      <td className="py-4 px-4 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {getInvoiceRangeLabel(inv)}
                      </td>
                      <td className="py-4 px-4 font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">₹{inv.totalAmount}</td>
                      <td className="py-4 px-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                          inv.status === 'PAID' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'
                        }`}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right flex justify-end gap-2 whitespace-nowrap">
                        {inv.status !== 'PAID' && (
                          <Button 
                            variant="outline" size="icon" 
                            disabled={payingInvoiceId === inv.id}
                            className="h-8 w-8 text-emerald-600 rounded-lg border-emerald-200 hover:bg-emerald-50 disabled:opacity-50"
                            title="Mark as Paid"
                            onClick={() => handleMarkAsPaid(inv.id)}
                          >
                            {payingInvoiceId === inv.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                          </Button>
                        )}
                        <Button 
                          variant="outline" size="icon" 
                          className="h-8 w-8 text-blue-600 rounded-lg border-blue-200 hover:bg-blue-50"
                          title="Download Bill"
                          onClick={() => generatePDF(inv)}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="outline" size="icon" 
                          className="h-8 w-8 text-green-600 rounded-lg border-green-200 hover:bg-green-50"
                          title="Send via WhatsApp"
                          onClick={() => {
                            const upiId = "8149101048-2@ybl";
                            const upiString = `upi://pay?pa=${upiId}&pn=Gharcha%20Dudh&am=${inv.totalAmount}&cu=INR`;
                            const encodedUpi = encodeURIComponent(upiString);
                            const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodedUpi}`;
                            const skippedNote = inv.skippedDates?.length
                              ? `%0ANo milk on: ${inv.skippedDates.join(', ')}`
                              : '';
                            
                            const text = `Hello ${inv.customerName},%0A%0AYour milk bill for ${getInvoiceRangeLabel(inv)} is generated.%0ATotal Amount: ₹${inv.totalAmount}%0AStatus: ${inv.status}${skippedNote}%0A%0APay instantly via this link:%0A${upiString}%0A%0AOr scan the QR code here:%0A${qrUrl}%0A%0A- Gharcha Dudh`;
                            window.open(`https://wa.me/?text=${text}`, '_blank');
                          }}
                        >
                          <MessageCircle className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="outline" size="icon" 
                          className="h-8 w-8 text-red-500 rounded-lg border-red-200 hover:bg-red-50"
                          title="Delete Bill"
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
          isOpen={!!deleteConfirmId}
          onClose={() => setDeleteConfirmId(null)}
          onConfirm={handleDeleteInvoice}
          title={t(language, 'confirmDeletionTitle')}
          description={t(language, 'deleteConfirm')}
          confirmText={t(language, 'delete')}
          cancelText={t(language, 'cancel')}
        />
      </div>
    </div>
  )
}
