import { useState, useEffect } from 'react'
import { Plus, Search, Loader2, Trash } from 'lucide-react'
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

interface Customer {
  id: string
  name: string
  phone: string
  address: string
  balance: number
  milkType: string
  ratePerLiter: number
  dailyQuantity: number
  autoEntryEnabled: boolean
  defaultMorningQuantity: number
  defaultEveningQuantity: number
  active: boolean
}

export default function Customers() {
  const { language } = useSettingsStore()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const emptyForm = {
    name: '',
    phone: '',
    address: '',
    milkType: 'COW',
    ratePerLiter: '60',
    dailyQuantity: '1',
    autoEntryEnabled: true,
    defaultMorningQuantity: '0',
    defaultEveningQuantity: '0',
  }
  const [formData, setFormData] = useState(emptyForm)
  const effectiveDailyQuantity = parseFloat(formData.dailyQuantity || '0') || 0
  const effectiveRate = parseFloat(formData.ratePerLiter || '0') || 0
  const estimatedAmount = effectiveDailyQuantity * effectiveRate

  const fetchCustomers = async () => {
    try {
      const res = await axios.get('/api/customers')
      if (res.data.success) {
        setCustomers(res.data.data)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchCustomers()
  }, [])

  const handleSubmitCustomer = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const computedDailyQuantity = parseFloat(formData.dailyQuantity || '0') || 0

      const payload = {
        ...formData,
        ratePerLiter: parseFloat(formData.ratePerLiter),
        dailyQuantity: computedDailyQuantity,
        autoEntryEnabled: true,
        defaultMorningQuantity: 0,
        defaultEveningQuantity: 0,
      }
      
      if (editingId) {
        const res = await axios.put(`/api/customers/${editingId}`, payload)
        if (res.data.success) {
          setCustomers(customers.map(c => c.id === editingId ? res.data.data : c))
        }
      } else {
        const res = await axios.post('/api/customers', payload)
        if (res.data.success) {
          setCustomers([...customers, res.data.data])
        }
      }
      
      setIsDialogOpen(false)
      setEditingId(null)
      setFormData(emptyForm)
    } catch (err: any) {
      console.error(err)
      const errorMsg = err.response?.data?.message || "Failed to save customer. Please try again."
      alert(errorMsg)
    }
  }

  const handleEditClick = (customer: Customer) => {
    setFormData({
      name: customer.name,
      phone: customer.phone,
      address: customer.address,
      milkType: customer.milkType,
      ratePerLiter: customer.ratePerLiter.toString(),
      dailyQuantity: customer.dailyQuantity?.toString() ?? '0',
      autoEntryEnabled: true,
      defaultMorningQuantity: '0',
      defaultEveningQuantity: '0',
    })
    setEditingId(customer.id)
    setIsDialogOpen(true)
  }

  const handleDeleteCustomer = async () => {
    if (deleteConfirmId) {
      try {
        const res = await axios.delete(`/api/customers/${deleteConfirmId}`)
        if (res.data.success) {
          setCustomers(customers.filter(c => c.id !== deleteConfirmId))
        }
      } catch (err: any) {
        console.error(err)
        alert("Failed to delete customer")
      } finally {
        setDeleteConfirmId(null)
      }
    }
  }

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.phone.includes(search)
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-800">{t(language, 'customersTitle')}</h1>
          <p className="text-slate-500 font-medium mt-1">{t(language, 'customersDesc')}</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open)
          if (!open) {
            setEditingId(null)
            setFormData(emptyForm)
          }
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2 shadow-[0_8px_20px_rgb(139,92,246,0.3)]">
              <Plus className="w-4 h-4" />
              {t(language, 'addCustomer')}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl rounded-3xl border border-slate-200/80 bg-white/95 p-0 shadow-2xl">
            <DialogHeader>
              <DialogTitle className="px-6 pt-6 text-2xl font-bold text-slate-900">
                {editingId ? t(language, 'editCustomer') : t(language, 'addCustomer')}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmitCustomer} className="space-y-5 px-6 pb-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t(language, 'name')}</label>
                  <input 
                    required type="text" value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full px-4 py-3 border border-slate-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t(language, 'mobile')}</label>
                  <input 
                    type="text" value={formData.phone}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                    placeholder="Optional"
                    className="w-full px-4 py-3 border border-slate-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t(language, 'milkType')}</label>
                  <select 
                    value={formData.milkType}
                    onChange={e => setFormData({...formData, milkType: e.target.value})}
                    className="w-full px-4 py-3 border border-slate-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="BUFFALO">{t(language, 'buffalo')}</option>
                    <option value="COW">{t(language, 'cow')}</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t(language, 'address')}</label>
                  <input 
                    type="text" value={formData.address}
                    onChange={e => setFormData({...formData, address: e.target.value})}
                    placeholder="Optional"
                    className="w-full px-4 py-3 border border-slate-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t(language, 'dailyQuantity')}</label>
                  <input
                    required
                    type="number"
                    step="0.5"
                    min="0"
                    value={formData.dailyQuantity}
                    onChange={e => setFormData({...formData, dailyQuantity: e.target.value})}
                    className="w-full px-4 py-3 border border-slate-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t(language, 'ratePerLiter')}</label>
                  <input 
                    required type="number" min="0" step="0.5" value={formData.ratePerLiter}
                    onChange={e => setFormData({...formData, ratePerLiter: e.target.value})}
                    className="w-full px-4 py-3 border border-slate-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div className="col-span-2 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4">
                  <div className="flex items-center justify-between text-sm text-slate-700">
                    <span className="font-medium">Calculation</span>
                    <span className="font-semibold">
                      {effectiveDailyQuantity.toFixed(1)} L x ₹{effectiveRate.toFixed(2)}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-sm text-slate-600">Estimated amount</span>
                    <span className="text-xl font-bold text-emerald-700">₹{estimatedAmount.toFixed(2)}</span>
                  </div>
                </div>
              </div>
              <Button type="submit" className="w-full rounded-2xl py-6 text-lg font-bold shadow-lg">
                {editingId ? t(language, 'updateCustomer') : t(language, 'saveCustomer')}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        <ConfirmDialog 
          isOpen={!!deleteConfirmId}
          onClose={() => setDeleteConfirmId(null)}
          onConfirm={handleDeleteCustomer}
          title={t(language, 'confirmDeletionTitle')}
          description={t(language, 'deleteConfirm')}
          confirmText={t(language, 'delete')}
          cancelText={t(language, 'cancel')}
        />
      </div>

      <div className="bg-white/40 backdrop-blur-xl rounded-[2rem] border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-4 sm:p-8">
        <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search customers..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white/40 border border-white/60 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 w-full sm:w-80 shadow-[0_2px_10px_rgb(0,0,0,0.02)] backdrop-blur-md transition-all focus:bg-white/80"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200/60 text-slate-500 text-sm">
                  <th className="pb-3 px-4 font-medium whitespace-nowrap">{t(language, 'name')}</th>
                  <th className="pb-3 px-4 font-medium whitespace-nowrap">{t(language, 'milkType')}</th>
                  <th className="pb-3 px-4 font-medium whitespace-nowrap">{t(language, 'dailyQuantity')}</th>
                  <th className="pb-3 px-4 font-medium whitespace-nowrap">{t(language, 'ratePerLiter')}</th>
                  <th className="pb-3 px-4 font-medium text-right whitespace-nowrap">Balance (₹)</th>
                  <th className="pb-3 px-4 font-medium text-right whitespace-nowrap">{t(language, 'actions')}</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">No customers found.</td>
                  </tr>
                ) : (
                  filteredCustomers.map((customer) => (
                    <tr key={customer.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-xs">
                            {customer.name.charAt(0)}
                          </div>
                          <span className="font-medium text-slate-800">{customer.name}</span>
                          {customer.autoEntryEnabled && (
                            <span className="ml-2 rounded-full bg-indigo-100 px-2 py-1 text-[11px] font-semibold text-indigo-700">
                              {t(language, 'autoEntry930')}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-md text-xs font-medium ${customer.milkType === 'COW' ? 'bg-orange-100 text-orange-700' : 'bg-slate-200 text-slate-700'}`}>
                          {customer.milkType}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-slate-600 whitespace-nowrap">{customer.dailyQuantity} L</td>
                      <td className="py-4 px-4 text-slate-600 whitespace-nowrap">₹{customer.ratePerLiter}</td>
                      <td className="py-4 px-4 text-right font-medium whitespace-nowrap">
                        <span className={customer.balance > 0 ? 'text-emerald-600' : customer.balance < 0 ? 'text-red-500' : 'text-slate-600'}>
                          {customer.balance}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right whitespace-nowrap">
                        <Button variant="ghost" size="sm" onClick={() => handleEditClick(customer)} className="text-primary-600 hover:text-primary-700">Edit</Button>
                        <Button variant="ghost" size="sm" onClick={() => setDeleteConfirmId(customer.id)} className="text-red-500 hover:text-red-600 hover:bg-red-50 ml-2 rounded-full">
                          <Trash className="w-4 h-4" />
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
