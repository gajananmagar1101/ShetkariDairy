import { useState, useEffect } from 'react'
import { Download, MessageCircle, Calculator, Loader2, Trash2 } from 'lucide-react'
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
import { useSettingsStore } from '../store/settingsStore'
import { t } from '../utils/translations'

interface Invoice {
  id: string
  customerId: string
  customerName: string
  invoiceMonth: number
  invoiceYear: number
  totalAmount: number
  paidAmount: number
  status: string
  dueDate: string
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
  const [selectedCustomer, setSelectedCustomer] = useState('')
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())

  useEffect(() => {
    fetchInvoices()
    fetchCustomers()
  }, [])

  const fetchInvoices = async () => {
    try {
      const res = await axios.get('/api/invoices')
      if (res.data.success) {
        setInvoices(res.data.data)
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
    try {
      const res = await axios.post(`/api/invoices/generate?customerId=${selectedCustomer}&year=${selectedYear}&month=${selectedMonth}`)
      if (res.data.success) {
        setInvoices([...invoices, res.data.data])
        setIsDialogOpen(false)
      }
    } catch (err) {
      console.error(err)
      alert("Failed to generate bill")
    }
  }

  const handleDeleteInvoice = async (id: string) => {
    if (!window.confirm(t(language, 'deleteConfirm') || "Are you sure you want to delete this bill?")) return;
    try {
      const res = await axios.delete(`/api/invoices/${id}`);
      if (res.data.success) {
        setInvoices(invoices.filter(inv => inv.id !== id));
      }
    } catch (err) {
      console.error(err);
      alert("Failed to delete bill.");
    }
  }

  const generatePDF = async (invoice: Invoice) => {
    const doc = new jsPDF()
    
    // Header
    doc.setFontSize(24)
    doc.setTextColor(37, 99, 235) // Blue-600
    doc.text("Makhan Dairy", 105, 20, { align: "center" })
    
    doc.setFontSize(14)
    doc.setTextColor(51, 65, 85) // Slate-700
    doc.text("Monthly Milk Bill", 105, 30, { align: "center" })
    
    // Details
    doc.setFontSize(12)
    doc.setTextColor(15, 23, 42) // Slate-900
    const monthName = new Date(0, invoice.invoiceMonth - 1).toLocaleString('default', { month: 'long' })
    doc.text(`Customer Name: ${invoice.customerName}`, 20, 50)
    doc.text(`Billing Month: ${monthName} ${invoice.invoiceYear}`, 20, 60)
    doc.text(`Due Date: ${invoice.dueDate || 'N/A'}`, 20, 70)
    doc.text(`Status: ${invoice.status}`, 20, 80)
    
    // Fetch detailed entries
    try {
      const res = await axios.get(`/api/milk-entries/customer-month?customerId=${invoice.customerId}&year=${invoice.invoiceYear}&month=${invoice.invoiceMonth}`)
      if (res.data.success && res.data.data.length > 0) {
        const entries = res.data.data
        // Sort by date
        entries.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
        
        const tableData = entries.map((e: any) => [
          e.date,
          e.morningQuantity > 0 ? `${e.morningQuantity} L` : '-',
          e.eveningQuantity > 0 ? `${e.eveningQuantity} L` : '-',
          `Rs. ${e.totalAmount}`
        ])

        autoTable(doc, {
          startY: 90,
          head: [['Date', 'Morning', 'Evening', 'Amount']],
          body: tableData,
          theme: 'striped',
          headStyles: { fillColor: [37, 99, 235] }
        })
      }
    } catch (err) {
      console.error("Failed to fetch detailed entries for bill", err)
    }

    // Dynamic Y position after table
    const finalY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 10 : 100

    // Total
    doc.setFontSize(16)
    doc.setFont("helvetica", "bold")
    doc.text(`Total Amount: Rs. ${invoice.totalAmount}`, 20, finalY)
    
    // Footer
    doc.setFontSize(10)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(100, 116, 139) // Slate-500
    doc.text("Thank you for your business! Please pay via UPI or Cash.", 105, finalY + 20, { align: "center" })

    // Generate UPI QR Code
    try {
      const upiId = "8149101048-2@ybl" // User's actual UPI ID
      const upiString = `upi://pay?pa=${upiId}&pn=Makhan%20Dairy&am=${invoice.totalAmount}&cu=INR`
      const qrDataUrl = await QRCode.toDataURL(upiString, { 
        width: 120, 
        margin: 1,
        color: { dark: '#0F172A', light: '#FFFFFF' }
      })
      doc.addImage(qrDataUrl, 'PNG', 90, finalY + 30, 30, 30)
      doc.text("Scan to Pay", 105, finalY + 65, { align: "center" })
    } catch (err) {
      console.error("Failed to generate QR code", err)
    }
    
    doc.save(`Bill_${invoice.customerName}_${monthName}_${invoice.invoiceYear}.pdf`)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{t(language, 'billingTitle')}</h1>
          <p className="text-slate-500 text-sm mt-1">{t(language, 'billingDesc')}</p>
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
              <DialogTitle>{t(language, 'generateAutoBill')}</DialogTitle>
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
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t(language, 'month')}</label>
                  <select 
                    value={selectedMonth}
                    onChange={e => setSelectedMonth(parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    {[...Array(12)].map((_, i) => (
                      <option key={i+1} value={i+1}>{new Date(0, i).toLocaleString('default', { month: 'long' })}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t(language, 'year')}</label>
                  <input 
                    type="number" value={selectedYear}
                    onChange={e => setSelectedYear(parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
              <Button type="submit" className="w-full rounded-xl mt-2">{t(language, 'generateBill')}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-white/60 backdrop-blur-md rounded-3xl border border-white/60 shadow-sm p-6">
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200/60 text-slate-500 text-sm">
                  <th className="pb-3 font-medium">{t(language, 'customer')}</th>
                  <th className="pb-3 font-medium">{t(language, 'billingPeriod')}</th>
                  <th className="pb-3 font-medium">{t(language, 'totalValue')}</th>
                  <th className="pb-3 font-medium">{t(language, 'status')}</th>
                  <th className="pb-3 font-medium text-right">{t(language, 'actions')}</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {invoices.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500">{t(language, 'noBills')}</td>
                  </tr>
                ) : (
                  invoices.map((inv) => (
                    <tr key={inv.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
                      <td className="py-4">
                        <span className="font-medium text-slate-800">{inv.customerName}</span>
                      </td>
                      <td className="py-4 text-slate-600">
                        {new Date(0, inv.invoiceMonth - 1).toLocaleString('default', { month: 'short' })} {inv.invoiceYear}
                      </td>
                      <td className="py-4 font-bold text-slate-700">₹{inv.totalAmount}</td>
                      <td className="py-4">
                        <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                          inv.status === 'PAID' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'
                        }`}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="py-4 text-right flex justify-end gap-2">
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
                            const upiString = `upi://pay?pa=${upiId}&pn=Makhan%20Dairy&am=${inv.totalAmount}&cu=INR`;
                            const encodedUpi = encodeURIComponent(upiString);
                            const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodedUpi}`;
                            
                            const text = `Hello ${inv.customerName},%0A%0AYour milk bill for ${new Date(0, inv.invoiceMonth - 1).toLocaleString('default', { month: 'short' })} ${inv.invoiceYear} is generated.%0ATotal Amount: ₹${inv.totalAmount}%0AStatus: ${inv.status}%0A%0APay instantly via this link:%0A${upiString}%0A%0AOr scan the QR code here:%0A${qrUrl}%0A%0AThank you!`;
                            window.open(`https://wa.me/?text=${text}`, '_blank');
                          }}
                        >
                          <MessageCircle className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="outline" size="icon" 
                          className="h-8 w-8 text-red-500 rounded-lg border-red-200 hover:bg-red-50"
                          title="Delete Bill"
                          onClick={() => handleDeleteInvoice(inv.id)}
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
      </div>
    </div>
  )
}
