import { useState, useEffect } from 'react'
import { Download, MessageCircle, Calculator, Loader2, Trash2, CheckCircle } from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
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
    }
  }

  const handleMarkAsPaid = async (invoiceId: string) => {
    try {
      const res = await axios.put(`/api/invoices/${invoiceId}/pay`)
      if (res.data.success) {
        setInvoices(invoices.map(inv => inv.id === invoiceId ? { ...inv, status: 'PAID' } : inv))
        toast.success('Invoice marked as paid and added to payments!')
      }
    } catch (err) {
      console.error(err)
      toast.error("Failed to mark as paid")
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
    const doc = new jsPDF()
    const rangeLabel = invoice.periodStartDate && invoice.periodEndDate
      ? `${formatDisplayDate(invoice.periodStartDate)} to ${formatDisplayDate(invoice.periodEndDate)}`
      : `${new Date(0, invoice.invoiceMonth - 1).toLocaleString('default', { month: 'long' })} ${invoice.invoiceYear}`
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const formatDate = (value: string) => new Date(value).toLocaleDateString('en-GB')

    const loadLogo = (): Promise<HTMLImageElement> => new Promise((resolve, reject) => {
      const img = new Image();
      img.src = '/logo.png';
      img.onload = () => resolve(img);
      img.onerror = () => reject();
    });

    doc.setDrawColor(226, 232, 240)
    doc.setFillColor(255, 255, 255)
    doc.roundedRect(12, 10, pageWidth - 24, 28, 4, 4, 'FD')
    
    // Attempt to add logo on the left
    let textStartX = 18;
    try {
      const img = await loadLogo();
      doc.addImage(img, 'PNG', 16, 13, 22, 22);
      textStartX = 42; // Move text to right if logo is loaded
    } catch (e) {
      // Ignore if logo not found
    }

    doc.setTextColor(30, 41, 59)
    doc.setFontSize(24)
    doc.setFont("helvetica", "bold")
    doc.text("Gharcha Dudh", textStartX, 23)
    
    doc.setTextColor(100, 116, 139)
    doc.setFontSize(10)
    doc.setFont("helvetica", "normal")
    doc.text("Milk Bill Statement", textStartX, 31)
    
    doc.setTextColor(15, 23, 42)
    doc.setFontSize(10)
    doc.setFont("helvetica", "bold")
    doc.text(rangeLabel, pageWidth - 16, 27, { align: "right" })

    // Bill summary box
    doc.setDrawColor(226, 232, 240)
    doc.setFillColor(248, 250, 252)
    doc.roundedRect(12, 44, pageWidth - 24, 24, 4, 4, 'FD')

    doc.setTextColor(71, 85, 105)
    doc.setFontSize(9)
    doc.text("Customer", 18, 51)
    doc.text("Billing Range", 80, 51)
    doc.text("Amount", pageWidth - 18, 51, { align: "right" })

    doc.setTextColor(15, 23, 42)
    doc.setFontSize(12)
    doc.setFont("helvetica", "bold")
    doc.text(invoice.customerName, 18, 60)
    doc.text(rangeLabel, 80, 60)
    doc.text(`Rs. ${Number(invoice.totalAmount).toFixed(2)}`, pageWidth - 18, 60, { align: "right" })

    let totalLiters = 0
    let deliveredDays = 0
    let lineItems: string[][] = []
    let computedSkippedDates: string[] = []
    
    try {
      const res = await axios.get(`/api/milk-entries/customer-range?customerId=${invoice.customerId}&startDate=${invoice.periodStartDate}&endDate=${invoice.periodEndDate}`)
      if (res.data.success) {
        const entries = res.data.data ?? []
        entries.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())

        lineItems = entries.map((e: any, index: number) => {
          const morning = Number(e.morningQuantity || 0)
          const evening = Number(e.eveningQuantity || 0)
          const liters = morning + evening
          totalLiters += liters
          deliveredDays += 1

          return [
            String(index + 1),
            formatDate(e.date),
            morning > 0 ? `${morning} L` : '-',
            evening > 0 ? `${evening} L` : '-',
            `${liters.toFixed(1)} L`,
            `Rs. ${Number(e.totalAmount || 0).toFixed(2)}`
          ]
        })

        const entryDates = new Set(entries.map((e: any) => e.date))
        const startDate = new Date(invoice.periodStartDate)
        const endDate = new Date(invoice.periodEndDate)
        const todayDate = new Date()
        const actualEndDate = endDate > todayDate ? todayDate : endDate

        for (let d = new Date(startDate); d <= actualEndDate; d.setDate(d.getDate() + 1)) {
          const dateStr = d.toISOString().split('T')[0]
          if (!entryDates.has(dateStr)) {
            computedSkippedDates.push(dateStr)
            lineItems.push([
              '-',
              formatDate(dateStr),
              '-',
              '-',
              '0.0 L',
              'No delivery'
            ])
          }
        }
      }
    } catch (err) {
      console.error("Failed to fetch detailed entries for bill", err)
    }

    lineItems.sort((a, b) => new Date(a[1].split('/').reverse().join('-')).getTime() - new Date(b[1].split('/').reverse().join('-')).getTime())

    autoTable(doc, {
      startY: 74,
      head: [['#', 'Date', 'Morning', 'Evening', 'Total', 'Amount']],
      body: lineItems,
      theme: 'grid',
      margin: { left: 12, right: 12 },
      styles: {
        fontSize: 8,
        cellPadding: 2,
        textColor: [30, 41, 59],
        lineColor: [226, 232, 240],
        lineWidth: 0.1,
      },
      headStyles: {
        fillColor: [37, 99, 235],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center',
      },
      bodyStyles: {
        halign: 'center',
      },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 28, halign: 'left' },
        2: { cellWidth: 26 },
        3: { cellWidth: 26 },
        4: { cellWidth: 24 },
        5: { cellWidth: 32, halign: 'right' },
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
    })

    const finalY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 8 : 150

    doc.setFont("helvetica", "normal")
    doc.setFontSize(9)
    let skippedDatesTextArray: string[] = []
    if (computedSkippedDates.length > 0) {
      const textStr = `No delivery dates: ${computedSkippedDates.map(formatDate).join(', ')}`
      skippedDatesTextArray = doc.splitTextToSize(textStr, pageWidth - 36)
    }

    const boxHeight = skippedDatesTextArray.length > 0 ? 12 + (skippedDatesTextArray.length * 4) : 16

    doc.setFillColor(239, 246, 255)
    doc.setDrawColor(191, 219, 254)
    doc.roundedRect(12, finalY, pageWidth - 24, boxHeight, 4, 4, 'FD')
    doc.setTextColor(37, 99, 235)
    doc.setFontSize(10)
    doc.setFont("helvetica", "normal")
    doc.text(`Delivered Days: ${deliveredDays}`, 18, finalY + 8)
    doc.text(`Skipped Days: ${computedSkippedDates.length}`, 70, finalY + 8)
    doc.text(`Total Liters: ${totalLiters.toFixed(1)} L`, 120, finalY + 8)
    doc.setFont("helvetica", "bold")
    doc.text(`Total Amount: Rs. ${Number(invoice.totalAmount).toFixed(2)}`, pageWidth - 18, finalY + 8, { align: "right" })

    if (skippedDatesTextArray.length > 0) {
      doc.setFont("helvetica", "normal")
      doc.setFontSize(9)
      doc.setTextColor(180, 83, 9)
      doc.text(skippedDatesTextArray, 18, finalY + 15)
    }

    // Generate UPI QR Code
    try {
      const upiId = "8149101048-2@ybl"
      const upiString = `upi://pay?pa=${upiId}&pn=Makhan%20Dairy&am=${invoice.totalAmount}&cu=INR`
      const qrDataUrl = await QRCode.toDataURL(upiString, { 
        width: 120, 
        margin: 1,
        color: { dark: '#0F172A', light: '#FFFFFF' }
      })
      const qrY = Math.min(finalY + boxHeight + 4, pageHeight - 48)
      doc.setDrawColor(226, 232, 240)
      doc.roundedRect(12, qrY - 4, pageWidth - 24, 34, 4, 4, 'S')
      doc.addImage(qrDataUrl, 'PNG', 18, qrY, 24, 24)
      doc.setTextColor(15, 23, 42)
      doc.setFontSize(11)
      doc.setFont("helvetica", "bold")
      doc.text("Pay via UPI", 50, qrY + 8)
      doc.setFont("helvetica", "normal")
      doc.setFontSize(9)
      doc.setTextColor(100, 116, 139)
      doc.text("Scan QR to complete payment quickly.", 50, qrY + 15)
      doc.text("Thank you for your business.", 50, qrY + 21)
    } catch (err) {
      console.error("Failed to generate QR code", err)
    }
    
    doc.save(`Bill_${invoice.customerName}_${rangeLabel.replaceAll('/', '-').replaceAll(' ', '_')}.pdf`)
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
            <form onSubmit={handleGenerate} className="space-y-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t(language, 'customer')}</label>
                <select 
                  required
                  value={selectedCustomer}
                  onChange={e => setSelectedCustomer(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="" disabled>Select Customer</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t(language, 'fromDate')}</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t(language, 'toDate')}</label>
                  <input 
                    type="date" value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
              <Button type="submit" className="w-full rounded-xl mt-2">{t(language, 'generateBill')}</Button>
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
                            className="h-8 w-8 text-emerald-600 rounded-lg border-emerald-200 hover:bg-emerald-50"
                            title="Mark as Paid"
                            onClick={() => handleMarkAsPaid(inv.id)}
                          >
                            <CheckCircle className="w-4 h-4" />
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
