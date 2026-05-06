import { useState, useEffect } from 'react'
import { Wallet, IndianRupee, Loader2, QrCode } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
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

interface Payment {
  id: string
  customerId: string
  customerName: string
  amount: number
  paymentDate: string
  paymentMethod: string
  status: string
}

interface Customer {
  id: string
  name: string
  balance: number
}

export default function Payments() {
  const { language } = useSettingsStore()
  const [payments, setPayments] = useState<Payment[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isQrDialogOpen, setIsQrDialogOpen] = useState(false)
  const [qrAmount, setQrAmount] = useState('1000')
  const [formData, setFormData] = useState({
    customerId: '',
    amount: '',
    paymentMethod: 'CASH',
    paymentDate: new Date().toISOString().split('T')[0]
  })

  useEffect(() => {
    fetchPayments()
    fetchCustomers()
  }, [])

  const fetchPayments = async () => {
    try {
      const res = await axios.get('/api/payments')
      if (res.data.success) {
        setPayments(res.data.data)
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

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.customerId) {
      alert("Please select a customer")
      return
    }
    try {
      const payload = {
        ...formData,
        amount: parseFloat(formData.amount)
      }
      const res = await axios.post('/api/payments', payload)
      if (res.data.success) {
        setPayments([res.data.data, ...payments]) // Prepend new payment
        setIsDialogOpen(false)
        fetchCustomers() // Refresh balances
        setFormData({ ...formData, amount: '', customerId: '' })
      }
    } catch (err) {
      console.error(err)
      alert("Failed to record payment")
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{t(language, 'paymentsTitle')}</h1>
          <p className="text-slate-500 text-sm mt-1">{t(language, 'paymentsDesc')}</p>
        </div>
        
        <div className="flex gap-2">
          <Dialog open={isQrDialogOpen} onOpenChange={setIsQrDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2 rounded-xl border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100">
                <QrCode className="w-4 h-4" />
                {t(language, 'showQR')}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md flex flex-col items-center">
              <DialogHeader>
                <DialogTitle>{t(language, 'receiveUPI')}</DialogTitle>
              </DialogHeader>
              <div className="mt-4 mb-6 p-4 bg-white rounded-2xl border-2 border-emerald-100 shadow-sm">
                <QRCodeSVG 
                  value={`upi://pay?pa=8149101048-2@ybl&pn=Makhan%20Dairy&am=${qrAmount}&cu=INR`} 
                  size={200}
                  bgColor={"#ffffff"}
                  fgColor={"#0f172a"}
                  level={"L"}
                />
              </div>
              <div className="w-full space-y-2">
                <label className="block text-sm font-medium text-slate-700 text-center">{t(language, 'amountToReceive')}</label>
                <input 
                  type="number" value={qrAmount}
                  onChange={e => setQrAmount(e.target.value)}
                  className="w-full px-3 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-center text-xl font-bold bg-slate-50"
                />
              </div>
              <p className="text-slate-500 text-xs mt-4 text-center">{t(language, 'scanQRMsg')}</p>
            </DialogContent>
          </Dialog>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 rounded-xl shadow-md bg-emerald-600 hover:bg-emerald-700">
                <IndianRupee className="w-4 h-4" />
                {t(language, 'recordPayment')}
              </Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t(language, 'recordNewPayment')}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleRecordPayment} className="space-y-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t(language, 'customer')}</label>
                <select 
                  required
                  value={formData.customerId}
                  onChange={e => setFormData({...formData, customerId: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="" disabled>Select Customer</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name} (Bal: ₹{c.balance})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t(language, 'amount')}</label>
                  <input 
                    required type="number" value={formData.amount}
                    onChange={e => setFormData({...formData, amount: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t(language, 'date')}</label>
                  <input 
                    required type="date" value={formData.paymentDate}
                    onChange={e => setFormData({...formData, paymentDate: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t(language, 'paymentMethod')}</label>
                  <select 
                    value={formData.paymentMethod}
                    onChange={e => setFormData({...formData, paymentMethod: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="CASH">Cash</option>
                    <option value="UPI">UPI (PhonePe, GPay, Paytm)</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                  </select>
                </div>
              </div>
              <Button type="submit" className="w-full rounded-xl mt-2 bg-emerald-600 hover:bg-emerald-700">{t(language, 'savePayment')}</Button>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <div className="bg-white/60 backdrop-blur-md rounded-3xl border border-white/60 shadow-sm p-6">
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200/60 text-slate-500 text-sm">
                  <th className="pb-3 font-medium">{t(language, 'customer')}</th>
                  <th className="pb-3 font-medium">{t(language, 'date')}</th>
                  <th className="pb-3 font-medium">{t(language, 'paymentMethod')}</th>
                  <th className="pb-3 font-medium">{t(language, 'status')}</th>
                  <th className="pb-3 font-medium text-right">{t(language, 'amountRs')}</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500">{t(language, 'noPayments')}</td>
                  </tr>
                ) : (
                  payments.map((payment) => (
                    <tr key={payment.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
                      <td className="py-4">
                        <span className="font-medium text-slate-800">{payment.customerName}</span>
                      </td>
                      <td className="py-4 text-slate-600">{payment.paymentDate}</td>
                      <td className="py-4">
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <Wallet className="w-4 h-4" />
                          <span>{payment.paymentMethod}</span>
                        </div>
                      </td>
                      <td className="py-4">
                        <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                          payment.status === 'PAID' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {payment.status}
                        </span>
                      </td>
                      <td className="py-4 text-right font-bold text-emerald-600">+₹{payment.amount}</td>
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
