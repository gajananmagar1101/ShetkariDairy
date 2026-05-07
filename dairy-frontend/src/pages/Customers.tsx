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
  const emptyForm = {
    name: '',
    phone: '',
    address: '',
    milkType: 'COW',
    ratePerLiter: '60',
    dailyQuantity: '1',
    autoEntryEnabled: false,
    defaultMorningQuantity: '0',
    defaultEveningQuantity: '1',
  }
  const [formData, setFormData] = useState(emptyForm)

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
      const morningQty = parseFloat(formData.defaultMorningQuantity || '0') || 0
      const eveningQty = parseFloat(formData.defaultEveningQuantity || '0') || 0
      const computedDailyQuantity = formData.autoEntryEnabled
        ? morningQty + eveningQty
        : parseFloat(formData.dailyQuantity || '0')

      const payload = {
        ...formData,
        ratePerLiter: parseFloat(formData.ratePerLiter),
        dailyQuantity: computedDailyQuantity,
        defaultMorningQuantity: morningQty,
        defaultEveningQuantity: eveningQty,
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
      autoEntryEnabled: customer.autoEntryEnabled ?? false,
      defaultMorningQuantity: customer.defaultMorningQuantity?.toString() ?? '0',
      defaultEveningQuantity: customer.defaultEveningQuantity?.toString() ?? '0',
    })
    setEditingId(customer.id)
    setIsDialogOpen(true)
  }

  const handleDeleteCustomer = async (id: string) => {
    if (window.confirm(t(language, 'deleteConfirm'))) {
      try {
        const res = await axios.delete(`/api/customers/${id}`)
        if (res.data.success) {
          setCustomers(customers.filter(c => c.id !== id))
        }
      } catch (err: any) {
        console.error(err)
        alert("Failed to delete customer")
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
          <h1 className="text-2xl font-bold text-slate-800">{t(language, 'customersTitle')}</h1>
          <p className="text-slate-500 text-sm mt-1">{t(language, 'customersDesc')}</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open)
          if (!open) {
            setEditingId(null)
            setFormData(emptyForm)
          }
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2 rounded-xl shadow-md">
              <Plus className="w-4 h-4" />
              {t(language, 'addCustomer')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? t(language, 'editCustomer') : t(language, 'addCustomer')}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmitCustomer} className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t(language, 'name')}</label>
                  <input 
                    required type="text" value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t(language, 'mobile')}</label>
                  <input 
                    required type="text" value={formData.phone}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t(language, 'milkType')}</label>
                  <select 
                    value={formData.milkType}
                    onChange={e => setFormData({...formData, milkType: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="COW">{t(language, 'cow')}</option>
                    <option value="BUFFALO">{t(language, 'buffalo')}</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t(language, 'address')}</label>
                  <input 
                    required type="text" value={formData.address}
                    onChange={e => setFormData({...formData, address: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t(language, 'dailyQuantity')}</label>
                  <input
                    required={!formData.autoEntryEnabled}
                    type="number"
                    step="0.5"
                    value={formData.autoEntryEnabled ? ((parseFloat(formData.defaultMorningQuantity || '0') || 0) + (parseFloat(formData.defaultEveningQuantity || '0') || 0)).toString() : formData.dailyQuantity}
                    onChange={e => setFormData({...formData, dailyQuantity: e.target.value})}
                    disabled={formData.autoEntryEnabled}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-slate-100 disabled:text-slate-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t(language, 'ratePerLiter')}</label>
                  <input 
                    required type="number" value={formData.ratePerLiter}
                    onChange={e => setFormData({...formData, ratePerLiter: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div className="col-span-2 rounded-2xl border border-indigo-200 bg-indigo-50/70 p-4">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.autoEntryEnabled}
                      onChange={e => setFormData({ ...formData, autoEntryEnabled: e.target.checked })}
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>
                      <span className="block text-sm font-semibold text-slate-800">{t(language, 'monthlyAutoEntry')}</span>
                      <span className="block text-xs text-slate-600 mt-1">{t(language, 'monthlyAutoEntryDesc')}</span>
                    </span>
                  </label>

                  {formData.autoEntryEnabled && (
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">{t(language, 'defaultMorningQty')}</label>
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          value={formData.defaultMorningQuantity}
                          onChange={e => setFormData({ ...formData, defaultMorningQuantity: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">{t(language, 'defaultEveningQty')}</label>
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          value={formData.defaultEveningQuantity}
                          onChange={e => setFormData({ ...formData, defaultEveningQuantity: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <Button type="submit" className="w-full rounded-xl mt-2">
                {editingId ? t(language, 'updateCustomer') : t(language, 'saveCustomer')}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-white/60 backdrop-blur-md rounded-3xl border border-white/60 shadow-sm p-6">
        <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search customers..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white/60 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 w-full sm:w-80 shadow-sm transition-all focus:bg-white"
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
                  <th className="pb-3 font-medium">{t(language, 'name')}</th>
                  <th className="pb-3 font-medium">{t(language, 'milkType')}</th>
                  <th className="pb-3 font-medium">{t(language, 'dailyQuantity')}</th>
                  <th className="pb-3 font-medium">{t(language, 'ratePerLiter')}</th>
                  <th className="pb-3 font-medium text-right">Balance (₹)</th>
                  <th className="pb-3 font-medium text-right">Actions</th>
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
                      <td className="py-4">
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
                      <td className="py-4">
                        <span className={`px-2 py-1 rounded-md text-xs font-medium ${customer.milkType === 'COW' ? 'bg-orange-100 text-orange-700' : 'bg-slate-200 text-slate-700'}`}>
                          {customer.milkType}
                        </span>
                      </td>
                      <td className="py-4 text-slate-600">{customer.dailyQuantity} L</td>
                      <td className="py-4 text-slate-600">₹{customer.ratePerLiter}</td>
                      <td className="py-4 text-right font-medium">
                        <span className={customer.balance > 0 ? 'text-emerald-600' : customer.balance < 0 ? 'text-red-500' : 'text-slate-600'}>
                          {customer.balance}
                        </span>
                      </td>
                      <td className="py-4 text-right">
                        <Button variant="ghost" size="sm" onClick={() => handleEditClick(customer)} className="text-primary-600 hover:text-primary-700">Edit</Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteCustomer(customer.id)} className="text-red-500 hover:text-red-600 hover:bg-red-50 ml-2">
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
