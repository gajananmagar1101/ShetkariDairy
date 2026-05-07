import { useState, useEffect } from 'react'
import { Calendar as CalendarIcon, Loader2, MessageCircle, Trash2, Ban, PencilLine, SquarePen, X } from 'lucide-react'
import axios from 'axios'
import { Button } from '../components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { useSettingsStore } from '../store/settingsStore'
import { t } from '../utils/translations'

interface Customer {
  id: string
  name: string
  skippedDates?: string[]
}

interface MilkEntry {
  id: string
  customerId: string
  customerName: string
  morningQuantity: number
  eveningQuantity: number
  fat: number
  snf: number
  ratePerLiter: number
  totalAmount: number
}

export default function MilkEntries() {
  const { language } = useSettingsStore()
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [entries, setEntries] = useState<MilkEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedCustomerId, setSelectedCustomerId] = useState('')
  const [isOverrideDialogOpen, setIsOverrideDialogOpen] = useState(false)
  const [overrideCustomerId, setOverrideCustomerId] = useState('')
  const [overrideQuantity, setOverrideQuantity] = useState('')
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<MilkEntry | null>(null)
  const [editMorning, setEditMorning] = useState('')
  const [editEvening, setEditEvening] = useState('')
  const [editFat, setEditFat] = useState('')
  const [editSnf, setEditSnf] = useState('')
  const [overrideStartDate, setOverrideStartDate] = useState(date)
  const [overrideEndDate, setOverrideEndDate] = useState(date)
  const [noDeliveryStartDate, setNoDeliveryStartDate] = useState(date)
  const [noDeliveryEndDate, setNoDeliveryEndDate] = useState(date)
  const [overrideIsRange, setOverrideIsRange] = useState(false)
  const [noDeliveryIsRange, setNoDeliveryIsRange] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  useEffect(() => {
    setOverrideStartDate(date)
    setOverrideEndDate(date)
    setNoDeliveryStartDate(date)
    setNoDeliveryEndDate(date)
  }, [date])

  useEffect(() => {
    fetchCustomers()
    fetchEntries(date)
  }, [date])

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

  const fetchEntries = async (selectedDate: string) => {
    setIsLoading(true)
    try {
      const res = await axios.get(`/api/milk-entries?date=${selectedDate}`)
      if (res.data.success) {
        setEntries(res.data.data)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteEntry = async () => {
    if (!deleteConfirmId) return;

    try {
      const res = await axios.delete(`/api/milk-entries/${deleteConfirmId}`);
      if (res.data.success) {
        fetchEntries(date);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to delete entry.");
    } finally {
      setDeleteConfirmId(null)
    }
  }

  const openEditDialog = (entry: MilkEntry) => {
    setEditingEntry(entry)
    setEditMorning(entry.morningQuantity?.toString() ?? '0')
    setEditEvening(entry.eveningQuantity?.toString() ?? '0')
    setEditFat(entry.fat != null ? entry.fat.toString() : '')
    setEditSnf(entry.snf != null ? entry.snf.toString() : '')
    setIsEditDialogOpen(true)
  }

  const handleEditEntry = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingEntry) return

    try {
      const res = await axios.put(`/api/milk-entries/${editingEntry.id}`, {
        morningQuantity: editMorning ? parseFloat(editMorning) : 0,
        eveningQuantity: editEvening ? parseFloat(editEvening) : 0,
        fat: editFat ? parseFloat(editFat) : null,
        snf: editSnf ? parseFloat(editSnf) : null,
        ratePerLiter: editingEntry.ratePerLiter,
      })

      if (res.data.success) {
        setIsEditDialogOpen(false)
        setEditingEntry(null)
        fetchEntries(date)
      }
    } catch (err) {
      console.error(err)
      alert('Failed to update entry.')
    }
  }

  const handleNoDelivery = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCustomerId) {
      alert('Please select a customer')
      return
    }

    try {
      const start = noDeliveryStartDate;
      const end = noDeliveryIsRange ? noDeliveryEndDate : noDeliveryStartDate;
      const res = await axios.post(`/api/customers/${selectedCustomerId}/no-delivery?startDate=${start}&endDate=${end}`)
      if (res.data.success) {
        setIsDialogOpen(false)
        setSelectedCustomerId('')
        fetchEntries(date)
        fetchCustomers()
      }
    } catch (err) {
      console.error(err)
      alert('Failed to mark no delivery.')
    }
  }

  const handleRemoveNoDelivery = async (customerId: string) => {
    try {
      const res = await axios.delete(`/api/customers/${customerId}/no-delivery?date=${date}`)
      if (res.data.success) {
        fetchCustomers()
      }
    } catch (err) {
      console.error(err)
      alert('Failed to remove no delivery.')
    }
  }

  const handleDeliveryOverride = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!overrideCustomerId || !overrideQuantity) {
      alert('Please select customer and quantity')
      return
    }

    try {
      const start = overrideStartDate;
      const end = overrideIsRange ? overrideEndDate : overrideStartDate;
      const res = await axios.post(`/api/customers/${overrideCustomerId}/delivery-override?startDate=${start}&endDate=${end}&quantity=${overrideQuantity}`)
      if (res.data.success) {
        setIsOverrideDialogOpen(false)
        setOverrideCustomerId('')
        setOverrideQuantity('')
        fetchEntries(date)
        fetchCustomers()
      }
    } catch (err) {
      console.error(err)
      alert('Failed to save special quantity.')
    }
  }

  const totalLiters = entries.reduce((acc, curr) => acc + curr.morningQuantity + curr.eveningQuantity, 0)
  const totalAmount = entries.reduce((acc, curr) => acc + curr.totalAmount, 0)
  const skippedCustomers = customers.filter(customer => customer.skippedDates?.includes(date))

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-800">{t(language, 'dailyMilkEntry')}</h1>
          <p className="text-slate-500 font-medium mt-1">{t(language, 'recordMilkDesc')}</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3 w-full sm:w-auto">
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="sm:max-w-md rounded-3xl">
              <DialogHeader>
                <DialogTitle>Edit Entry</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleEditEntry} className="space-y-4 mt-2">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Morning (L)</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={editMorning}
                      onChange={e => setEditMorning(e.target.value)}
                      className="w-full px-4 py-3 border border-slate-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Evening (L)</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={editEvening}
                      onChange={e => setEditEvening(e.target.value)}
                      className="w-full px-4 py-3 border border-slate-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Fat %</label>
                    <input
                      type="number"
                      step="0.1"
                      value={editFat}
                      onChange={e => setEditFat(e.target.value)}
                      className="w-full px-4 py-3 border border-slate-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">SNF</label>
                    <input
                      type="number"
                      step="0.1"
                      value={editSnf}
                      onChange={e => setEditSnf(e.target.value)}
                      className="w-full px-4 py-3 border border-slate-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full rounded-2xl">Save Changes</Button>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={isOverrideDialogOpen} onOpenChange={setIsOverrideDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2 rounded-2xl border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 w-full sm:w-auto">
                <PencilLine className="h-4 w-4" />
                {t(language, 'specialQuantity')}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md rounded-[2rem]">
              <DialogHeader>
                <DialogTitle>{t(language, 'specialQuantity')}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleDeliveryOverride} className="space-y-4 mt-2">
                <div className="flex items-center gap-2 mb-2">
                  <input 
                    type="checkbox" 
                    id="overrideIsRange"
                    checked={overrideIsRange} 
                    onChange={(e) => setOverrideIsRange(e.target.checked)}
                    className="rounded text-primary-600 focus:ring-primary-500"
                  />
                  <label htmlFor="overrideIsRange" className="text-sm font-medium text-slate-700">{t(language, 'selectDateRange')}</label>
                </div>
                
                {overrideIsRange ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">{t(language, 'fromDate')}</label>
                      <input
                        type="date"
                        value={overrideStartDate}
                        onChange={e => setOverrideStartDate(e.target.value)}
                        className="w-full px-4 py-3 border border-slate-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">{t(language, 'toDate')}</label>
                      <input
                        type="date"
                        value={overrideEndDate}
                        onChange={e => setOverrideEndDate(e.target.value)}
                        className="w-full px-4 py-3 border border-slate-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                    <input
                      type="date"
                      value={overrideStartDate}
                      onChange={e => setOverrideStartDate(e.target.value)}
                      className="w-full px-4 py-3 border border-slate-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t(language, 'customer')}</label>
                  <select
                    required
                    value={overrideCustomerId}
                    onChange={e => setOverrideCustomerId(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="" disabled>Select Customer</option>
                    {customers.map(customer => (
                      <option key={customer.id} value={customer.id}>{customer.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Quantity (L)</label>
                  <input
                    required
                    type="number"
                    step="0.5"
                    min="0"
                    value={overrideQuantity}
                    onChange={e => setOverrideQuantity(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <Button type="submit" className="w-full rounded-2xl">{t(language, 'saveSpecialQuantity')}</Button>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2 rounded-2xl border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 w-full sm:w-auto">
                <Ban className="h-4 w-4" />
                {t(language, 'noDelivery')}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md rounded-[2rem]">
              <DialogHeader>
                <DialogTitle>{t(language, 'noDelivery')}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleNoDelivery} className="space-y-4 mt-2">
                <div className="flex items-center gap-2 mb-2">
                  <input 
                    type="checkbox" 
                    id="noDeliveryIsRange"
                    checked={noDeliveryIsRange} 
                    onChange={(e) => setNoDeliveryIsRange(e.target.checked)}
                    className="rounded text-primary-600 focus:ring-primary-500"
                  />
                  <label htmlFor="noDeliveryIsRange" className="text-sm font-medium text-slate-700">{t(language, 'selectDateRange')}</label>
                </div>

                {noDeliveryIsRange ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">{t(language, 'fromDate')}</label>
                      <input
                        type="date"
                        value={noDeliveryStartDate}
                        onChange={e => setNoDeliveryStartDate(e.target.value)}
                        className="w-full px-4 py-3 border border-slate-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">{t(language, 'toDate')}</label>
                      <input
                        type="date"
                        value={noDeliveryEndDate}
                        onChange={e => setNoDeliveryEndDate(e.target.value)}
                        className="w-full px-4 py-3 border border-slate-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                    <input
                      type="date"
                      value={noDeliveryStartDate}
                      onChange={e => setNoDeliveryStartDate(e.target.value)}
                      className="w-full px-4 py-3 border border-slate-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t(language, 'customer')}</label>
                  <select
                    required
                    value={selectedCustomerId}
                    onChange={e => setSelectedCustomerId(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="" disabled>Select Customer</option>
                    {customers.map(customer => (
                      <option key={customer.id} value={customer.id}>{customer.name}</option>
                    ))}
                  </select>
                </div>
                <Button type="submit" className="w-full rounded-2xl">{t(language, 'saveNoDelivery')}</Button>
              </form>
            </DialogContent>
          </Dialog>

          <div className="flex items-center gap-2 bg-white/60 p-2 rounded-[1.25rem] border border-white/80 w-full sm:w-auto shadow-sm backdrop-blur-sm justify-between sm:justify-start">
            <CalendarIcon className="w-5 h-5 text-primary-500 ml-2" />
            <input 
              type="date" 
              value={date}
              onChange={e => setDate(e.target.value)}
              className="bg-transparent border-none focus:outline-none text-slate-700 font-medium cursor-pointer w-[130px]"
            />
          </div>
        </div>
      </div>

      <div className="bg-white/40 backdrop-blur-xl rounded-[2rem] border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-4 sm:p-8">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-lg text-slate-800">{t(language, 'todaysCollection')}</h3>
            <div className="flex gap-4">
              <div className="text-right">
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">{t(language, 'totalLiters')}</p>
                <p className="text-lg font-bold text-blue-600">{totalLiters.toFixed(1)} L</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">{t(language, 'totalValue')}</p>
                <p className="text-lg font-bold text-emerald-600">₹{totalAmount.toFixed(2)}</p>
              </div>
            </div>
          </div>

          {skippedCustomers.length > 0 && (
            <div className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <span className="font-semibold">{t(language, 'noDelivery')}:</span>
              {skippedCustomers.map(customer => (
                <span key={customer.id} className="inline-flex items-center gap-1 bg-amber-100 text-amber-900 px-2 py-1 rounded-lg">
                  {customer.name}
                  <button 
                    onClick={() => handleRemoveNoDelivery(customer.id)} 
                    className="hover:text-red-600 focus:outline-none ml-1"
                    title="Remove No Delivery"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          <div className="overflow-x-auto flex-1">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200/60 text-slate-500 text-sm">
                    <th className="pb-3 px-4 font-medium min-w-[120px] whitespace-nowrap">{t(language, 'customer')}</th>
                    <th className="pb-3 px-4 font-medium text-center whitespace-nowrap">{t(language, 'morning')}</th>
                    <th className="pb-3 px-4 font-medium text-center whitespace-nowrap">{t(language, 'evening')}</th>
                    <th className="pb-3 px-4 font-medium text-right whitespace-nowrap">{t(language, 'amountRs')}</th>
                    <th className="pb-3 px-4 font-medium text-right whitespace-nowrap">{t(language, 'actions')}</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {entries.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-500">{t(language, 'noEntries')}</td>
                    </tr>
                  ) : (
                    entries.map((entry) => (
                      <tr key={entry.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
                        <td className="py-4 px-4 whitespace-nowrap">
                           <span className="font-medium text-slate-800">{entry.customerName}</span>
                        </td>
                        <td className="py-4 px-4 text-center whitespace-nowrap">
                          <span className={entry.morningQuantity > 0 ? "font-bold text-blue-600" : "text-slate-400"}>
                            {entry.morningQuantity > 0 ? `${entry.morningQuantity} L` : '-'}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-center whitespace-nowrap">
                          <span className={entry.eveningQuantity > 0 ? "font-bold text-indigo-600" : "text-slate-400"}>
                            {entry.eveningQuantity > 0 ? `${entry.eveningQuantity} L` : '-'}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-right font-bold text-slate-700 whitespace-nowrap">
                          {entry.totalAmount}
                        </td>
                        <td className="py-4 px-4 text-right whitespace-nowrap">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost" size="icon"
                              title="Edit Entry"
                              className="h-8 w-8 text-blue-600 rounded-lg hover:bg-blue-50"
                              onClick={() => openEditDialog(entry)}
                            >
                              <SquarePen className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" size="icon" 
                              title={t(language, 'deleteEntry')}
                              className="h-8 w-8 text-red-500 rounded-lg hover:bg-red-50"
                              onClick={() => setDeleteConfirmId(entry.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" size="icon" 
                              title="WhatsApp Message"
                              className="h-8 w-8 text-green-600 rounded-lg hover:bg-green-50"
                              onClick={() => {
                                const totalQty = entry.morningQuantity + entry.eveningQuantity;
                                const text = `नमस्कार ${entry.customerName},%0A%0Aआजची तुमची दूध नोंद:%0Aसकाळ: ${entry.morningQuantity > 0 ? entry.morningQuantity + 'L' : '-'}%0Aसंध्याकाळ: ${entry.eveningQuantity > 0 ? entry.eveningQuantity + 'L' : '-'}%0Aएकूण: ${totalQty} L%0Aरक्कम: ₹${entry.totalAmount}%0A%0A- घरचं दूध (Gharcha Dudh)`;
                                window.open(`https://wa.me/?text=${text}`, '_blank');
                              }}
                            >
                              <MessageCircle className="w-4 h-4" />
                            </Button>
                          </div>
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
              onConfirm={handleDeleteEntry}
              title={t(language, 'confirmDeletionTitle')}
              description={language === 'mr' ? 'ही नोंद हटवल्याने ग्राहकाचे बिल बदलेल. तुम्हाला नक्की ही नोंद काढायची आहे का?' : 'Deleting this entry will adjust the customer\'s bill. Are you sure you want to delete this entry?'}
              confirmText={t(language, 'delete')}
              cancelText={t(language, 'cancel')}
          />
      </div>
      </div>
  )
}
