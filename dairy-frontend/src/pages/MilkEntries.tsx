import { useState, useEffect, useMemo } from 'react'
import { Calendar as CalendarIcon, Loader2, MessageCircle, Trash2, Ban, PencilLine, SquarePen, X, ChevronLeft, ChevronRight, ChevronDown, AlertCircle, Play } from 'lucide-react'
import toast from 'react-hot-toast'
import axios from 'axios'
import { Button } from '../components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { useSettingsStore } from '../store/settingsStore'
import { t } from '../utils/translations'
import { fetchCustomersWithCache, invalidateCustomerCache } from '../lib/customerCache'

interface Customer {
  id: string
  name: string
  skippedDates?: string[]
  specialCondition?: {
    startDate: string
    endDate: string
    quantity: number
    active: boolean
  } | null
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

const getLocalDataString = (d: Date) => {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export default function MilkEntries() {
  const { language } = useSettingsStore()
  const [date, setDate] = useState(getLocalDataString(new Date()))
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
  const [overrideError, setOverrideError] = useState('')
  const [noDeliveryError, setNoDeliveryError] = useState('')
  const [isOverridesExpanded, setIsOverridesExpanded] = useState(false)
  const [isNoDeliveryExpanded, setIsNoDeliveryExpanded] = useState(true)
  const [isSpecialQuantitiesExpanded, setIsSpecialQuantitiesExpanded] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Auto-switch date at midnight
  useEffect(() => {
    const now = new Date();
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const msUntilMidnight = tomorrow.getTime() - now.getTime() + 1000; // Add 1 second buffer

    const timer = setTimeout(() => {
      // Only auto-switch if the user was currently looking at "today"
      if (date === getLocalDataString(now)) {
        setDate(getLocalDataString(new Date()));
      }
    }, msUntilMidnight);

    return () => clearTimeout(timer);
  }, [date]);
  useEffect(() => {
    setOverrideStartDate(date)
    setOverrideEndDate(date)
    setNoDeliveryStartDate(date)
    setNoDeliveryEndDate(date)
  }, [date])

  useEffect(() => {
    fetchCustomers()
  }, [])

  useEffect(() => {
    fetchEntries(date)
  }, [date])

  const handlePrevDay = () => {
    const d = new Date(date);
    d.setDate(d.getDate() - 1);
    setDate(d.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const d = new Date(date);
    d.setDate(d.getDate() + 1);
    setDate(d.toISOString().split('T')[0]);
  };

  const handleAutoGenerate = async () => {
    try {
      setIsSubmitting(true)
      const res = await axios.post(`/api/milk-entries/auto-generate?date=${date}`)
      if (res.data.success) {
        const count = res.data.data
        if (count > 0) {
          toast.success(language === 'mr' ? `${count} नोंदी यशस्वीरित्या जनरेट झाल्या!` : `Successfully generated ${count} entries!`)
          fetchEntries(date)
        } else {
          toast.success(language === 'mr' ? 'कोणतीही नवीन नोंदणी आवश्यक नाही' : 'No new entries needed')
        }
      }
    } catch (error) {
      console.error(error)
      toast.error(language === 'mr' ? 'ऑटो जनरेट करण्यात त्रुटी' : 'Failed to auto-generate entries')
    } finally {
      setIsSubmitting(false)
    }
  }

  const fetchCustomers = async () => {
    try {
      setCustomers(await fetchCustomersWithCache<Customer>())
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
    if (!editingEntry || isSubmitting) return
    setIsSubmitting(true)
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
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleNoDelivery = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSubmitting) return
    if (!selectedCustomerId) {
      toast.error('Please select a customer')
      return
    }

    setIsSubmitting(true)

    const customer = customers.find(c => c.id === selectedCustomerId);
    if (!customer) return;

    const start = noDeliveryStartDate;
    const end = noDeliveryIsRange ? noDeliveryEndDate : noDeliveryStartDate;

    if (customer.specialCondition?.active) {
      const spStart = customer.specialCondition.startDate;
      const spEnd = customer.specialCondition.endDate;
      
      if (start <= spEnd && end >= spStart) {
        setNoDeliveryError(language === 'mr' ? 'ही तारीख आधीच Special Quantity मध्ये वापरली आहे.' : 'Date is already used in Special Quantity.');
        return;
      }
    }

    try {
      const res = await axios.post(`/api/customers/${selectedCustomerId}/no-delivery?startDate=${start}&endDate=${end}`)
      if (res.data.success) {
        invalidateCustomerCache()
        setIsDialogOpen(false)
        setSelectedCustomerId('')
        fetchEntries(date)
        fetchCustomers()
      }
    } catch (err) {
      console.error(err)
      toast.error('Failed to mark no delivery.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRemoveNoDelivery = async (customerId: string) => {
    try {
      const res = await axios.delete(`/api/customers/${customerId}/no-delivery?date=${date}`)
      if (res.data.success) {
        invalidateCustomerCache()
        fetchCustomers()
      }
    } catch (err) {
      console.error(err)
      toast.error('Failed to remove no delivery.')
    }
  }

  const handleEditNoDelivery = (customer: Customer) => {
    setSelectedCustomerId(customer.id);
    if (customer.skippedDates && customer.skippedDates.length > 0) {
      const sorted = [...customer.skippedDates].sort();
      setNoDeliveryStartDate(sorted[0]);
      setNoDeliveryEndDate(sorted[sorted.length - 1]);
      setNoDeliveryIsRange(sorted[0] !== sorted[sorted.length - 1]);
    } else {
      setNoDeliveryStartDate(date);
      setNoDeliveryEndDate(date);
      setNoDeliveryIsRange(false);
    }
    setIsDialogOpen(true);
  }

  const handleDeliveryOverride = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSubmitting) return
    if (!overrideCustomerId || !overrideQuantity) {
      toast.error('Please select customer and quantity')
      return
    }

    setIsSubmitting(true)

    const customer = customers.find(c => c.id === overrideCustomerId);
    if (!customer) return;

    const start = overrideStartDate;
    const end = overrideIsRange ? overrideEndDate : overrideStartDate;

    if (customer.skippedDates && customer.skippedDates.length > 0) {
      const hasOverlap = customer.skippedDates.some(skippedDate => {
        return skippedDate >= start && skippedDate <= end;
      });

      if (hasOverlap) {
        setOverrideError(language === 'mr' ? 'ही तारीख आधीच No Delivery मध्ये वापरली आहे.' : 'Date is already used in No Delivery.');
        return;
      }
    }

    try {
      
      const payload = {
        ...customer,
        specialCondition: {
          startDate: start,
          endDate: end,
          quantity: parseFloat(overrideQuantity),
          active: true
        }
      }

      const res = await axios.put(`/api/customers/${overrideCustomerId}`, payload)
      if (res.data.success) {
        invalidateCustomerCache()
        setIsOverrideDialogOpen(false)
        setOverrideCustomerId('')
        setOverrideQuantity('')
        fetchEntries(date)
        fetchCustomers()
      }
    } catch (err) {
      console.error(err)
      toast.error('Failed to save special quantity.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleTurnOffSpecialCondition = async (customerId: string) => {
    const customer = customers.find(c => c.id === customerId);
    if (!customer || !customer.specialCondition) return;

    try {
      const payload = {
        ...customer,
        specialCondition: {
          ...customer.specialCondition,
          active: false
        }
      }
      const res = await axios.put(`/api/customers/${customerId}`, payload);
      if (res.data.success) {
        invalidateCustomerCache()
        fetchCustomers();
      }
    } catch (err) {
      console.error("Failed to turn off special condition", err);
    }
  }

  const handleEditSpecialCondition = (customer: Customer) => {
    if (!customer.specialCondition) return;
    setOverrideCustomerId(customer.id);
    setOverrideStartDate(customer.specialCondition.startDate);
    setOverrideEndDate(customer.specialCondition.endDate);
    setOverrideIsRange(customer.specialCondition.startDate !== customer.specialCondition.endDate);
    setOverrideQuantity(customer.specialCondition.quantity.toString());
    setIsOverrideDialogOpen(true);
  }

  const totalLiters = useMemo(
    () => entries.reduce((acc, curr) => acc + curr.morningQuantity + curr.eveningQuantity, 0),
    [entries]
  )
  const totalAmount = useMemo(
    () => entries.reduce((acc, curr) => acc + curr.totalAmount, 0),
    [entries]
  )
  
  const todayDate = new Date();
  const todayStr = getLocalDataString(todayDate);
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayStr = getLocalDataString(yesterdayDate);

  const activeNoDeliveryCustomers = useMemo(
    () => customers.filter(customer => {
      if (!customer.skippedDates || customer.skippedDates.length === 0) return false;
      return customer.skippedDates.includes(date);
    }),
    [customers, date]
  )
  
  const activeSpecialConditions = useMemo(
    () => customers.filter(customer => {
      const cond = customer.specialCondition;
      if (!cond || !cond.active) return false;
      return date >= cond.startDate && date <= cond.endDate;
    }),
    [customers, date]
  )
  
  const allDisplayEntries = useMemo(() => {
    const actualCustomerIds = new Set(entries.map(e => e.customerId));
    const customersSkippedForSelectedDate = customers.filter(customer => customer.skippedDates?.includes(date));
    const virtualSkippedEntries = customersSkippedForSelectedDate
      .filter(c => !actualCustomerIds.has(c.id))
      .map(c => ({
        id: `virtual-skipped-${c.id}`,
        customerId: c.id,
        customerName: c.name,
        morningQuantity: 0,
        eveningQuantity: 0,
        fat: 0,
        snf: 0,
        ratePerLiter: 0,
        totalAmount: 0,
        isVirtualSkipped: true
      }));

    return [...entries, ...virtualSkippedEntries];
  }, [customers, date, entries]);

  const totalOverridesCount = activeNoDeliveryCustomers.length + activeSpecialConditions.length;

  return (
    <div className="space-y-6 min-w-0">
      <div className="flex min-w-0 flex-col justify-between gap-4 xl:flex-row xl:items-center">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-800 dark:text-white break-words">{t(language, 'dailyMilkEntry')}</h1>
          <p className="text-slate-500 dark:text-slate-300 font-medium mt-1 break-words">{t(language, 'recordMilkDesc')}</p>
        </div>
        
        <div className="flex w-full min-w-0 flex-col gap-3 xl:w-auto xl:items-end">
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{t(language, 'editEntryTitle')}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleEditEntry} className="mt-3 space-y-4">
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">{t(language, 'morningL')}</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={editMorning}
                      onChange={e => setEditMorning(e.target.value)}
                      className="w-full rounded-[1.4rem] border border-white/60 bg-white/45 px-4 py-3.5 text-slate-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-primary-500/40"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">{t(language, 'eveningL')}</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={editEvening}
                      onChange={e => setEditEvening(e.target.value)}
                      className="w-full rounded-[1.4rem] border border-white/60 bg-white/45 px-4 py-3.5 text-slate-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-primary-500/40"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">{t(language, 'fatOpt')}</label>
                    <input
                      type="number"
                      step="0.1"
                      value={editFat}
                      onChange={e => setEditFat(e.target.value)}
                      className="w-full rounded-[1.4rem] border border-white/60 bg-white/45 px-4 py-3.5 text-slate-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-primary-500/40"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">{t(language, 'snfOpt')}</label>
                    <input
                      type="number"
                      step="0.1"
                      value={editSnf}
                      onChange={e => setEditSnf(e.target.value)}
                      className="w-full rounded-[1.4rem] border border-white/60 bg-white/45 px-4 py-3.5 text-slate-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-primary-500/40"
                    />
                  </div>
                </div>
                <Button type="submit" disabled={isSubmitting} className="mt-2 h-14 w-full rounded-[1.6rem] shadow-[0_12px_30px_rgba(139,92,246,0.28)]">
                  {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : t(language, 'saveChanges')}
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          <div className="flex w-full min-w-0 flex-wrap items-center gap-2 xl:w-auto xl:justify-end">
            <Button 
              variant="outline" 
              onClick={handleAutoGenerate}
              disabled={isSubmitting}
              className="h-auto min-w-0 flex-1 gap-2 rounded-[1.25rem] border-emerald-200 bg-emerald-50 px-4 py-2 text-emerald-700 hover:bg-emerald-100 xl:flex-none"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              <span className="hidden lg:inline">{language === 'mr' ? 'ऑटो जनरेट' : 'Auto Generate'}</span>
              <span className="lg:hidden">{language === 'mr' ? 'ऑटो' : 'Auto'}</span>
            </Button>
            <Dialog open={isOverrideDialogOpen} onOpenChange={(open) => { setIsOverrideDialogOpen(open); if(open) setOverrideError(''); }}>
              <DialogTrigger asChild>
                <Button variant="outline" className="h-auto min-w-0 flex-1 gap-2 rounded-[1.25rem] border-blue-200 bg-blue-50 px-4 py-2 text-blue-700 hover:bg-blue-100 xl:flex-none">
                  <PencilLine className="h-4 w-4" />
                  <span className="hidden lg:inline">{t(language, 'specialQuantity')}</span>
                  <span className="lg:hidden">{t(language, 'specialQtyShort')}</span>
                </Button>
              </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{t(language, 'specialQuantity')}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleDeliveryOverride} className="mt-3 space-y-4">
                {overrideError && (
                  <div className="rounded-[1.25rem] border border-red-200/70 bg-red-50/80 px-3 py-2.5 text-sm font-medium text-red-600 backdrop-blur-sm">
                    {overrideError}
                  </div>
                )}
                <div className="mb-2 flex items-center gap-2 rounded-[1.25rem] bg-white/25 px-1 py-1 backdrop-blur-sm">
                  <input 
                    type="checkbox" 
                    id="overrideIsRange"
                    checked={overrideIsRange} 
                    onChange={(e) => setOverrideIsRange(e.target.checked)}
                    className="rounded text-primary-600 focus:ring-primary-500"
                  />
                  <label htmlFor="overrideIsRange" className="text-sm font-semibold text-slate-700">{t(language, 'selectDateRange')}</label>
                </div>
                
                {overrideIsRange ? (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-slate-700">{t(language, 'fromDate')}</label>
                      <input
                        type="date"
                        min={new Date().toISOString().split('T')[0]}
                        value={overrideStartDate}
                        onChange={e => { setOverrideStartDate(e.target.value); setOverrideError(''); }}
                        className="w-full rounded-[1.4rem] border border-white/60 bg-white/45 px-4 pr-11 py-3.5 text-[15px] text-slate-800 [font-variant-numeric:tabular-nums] shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-primary-500/40 sm:text-base"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-slate-700">{t(language, 'toDate')}</label>
                      <input
                        type="date"
                        min={overrideStartDate}
                        value={overrideEndDate}
                        onChange={e => { setOverrideEndDate(e.target.value); setOverrideError(''); }}
                        className="w-full rounded-[1.4rem] border border-white/60 bg-white/45 px-4 pr-11 py-3.5 text-[15px] text-slate-800 [font-variant-numeric:tabular-nums] shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-primary-500/40 sm:text-base"
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">{t(language, 'dateLabel')}</label>
                    <input
                      type="date"
                      min={new Date().toISOString().split('T')[0]}
                      value={overrideStartDate}
                      onChange={e => { setOverrideStartDate(e.target.value); setOverrideError(''); }}
                      className="w-full rounded-[1.4rem] border border-white/60 bg-white/45 px-4 pr-11 py-3.5 text-[15px] text-slate-800 [font-variant-numeric:tabular-nums] shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-primary-500/40 sm:text-base"
                    />
                  </div>
                )}
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">{t(language, 'customer')}</label>
                  <select
                    required
                    value={overrideCustomerId}
                    onChange={e => { setOverrideCustomerId(e.target.value); setOverrideError(''); }}
                    className="w-full rounded-[1.4rem] border border-white/60 bg-white/45 px-4 py-3.5 text-slate-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-primary-500/40"
                  >
                    <option value="" disabled>Select Customer</option>
                    {customers.map(customer => (
                      <option key={customer.id} value={customer.id}>{customer.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">{t(language, 'quantityL')}</label>
                  <input
                    required
                    type="number"
                    step="0.5"
                    min="0"
                    value={overrideQuantity}
                    onChange={e => setOverrideQuantity(e.target.value)}
                    className="w-full rounded-[1.4rem] border border-white/60 bg-white/45 px-4 py-3.5 text-slate-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-primary-500/40"
                  />
                </div>
                <Button type="submit" disabled={isSubmitting} className="mt-2 h-14 w-full rounded-[1.6rem] shadow-[0_12px_30px_rgba(139,92,246,0.28)]">
                  {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : t(language, 'saveSpecialQuantity')}
                </Button>
              </form>
            </DialogContent>
          </Dialog>

            <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if(open) setNoDeliveryError(''); }}>
              <DialogTrigger asChild>
              <Button variant="outline" className="h-auto min-w-0 flex-1 gap-2 rounded-[1.25rem] border-rose-200 bg-rose-50 px-4 py-2 text-rose-700 hover:bg-rose-100 xl:flex-none">
                <Ban className="h-4 w-4" />
                <span className="hidden lg:inline">{t(language, 'noDelivery')}</span>
                <span className="lg:hidden">{t(language, 'skipShort')}</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{t(language, 'noDelivery')}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleNoDelivery} className="mt-3 space-y-4">
                {noDeliveryError && (
                  <div className="rounded-[1.25rem] border border-red-200/70 bg-red-50/80 px-3 py-2.5 text-sm font-medium text-red-600 backdrop-blur-sm">
                    {noDeliveryError}
                  </div>
                )}
                <div className="mb-2 flex items-center gap-2 rounded-[1.25rem] bg-white/25 px-1 py-1 backdrop-blur-sm">
                  <input 
                    type="checkbox" 
                    id="noDeliveryIsRange"
                    checked={noDeliveryIsRange} 
                    onChange={(e) => setNoDeliveryIsRange(e.target.checked)}
                    className="rounded text-primary-600 focus:ring-primary-500"
                  />
                  <label htmlFor="noDeliveryIsRange" className="text-sm font-semibold text-slate-700">{t(language, 'selectDateRange')}</label>
                </div>

                {noDeliveryIsRange ? (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-slate-700">{t(language, 'fromDate')}</label>
                      <input
                        type="date"
                        value={noDeliveryStartDate}
                        onChange={e => { setNoDeliveryStartDate(e.target.value); setNoDeliveryError(''); }}
                        className="w-full rounded-[1.4rem] border border-white/60 bg-white/45 px-4 pr-11 py-3.5 text-[15px] text-slate-800 [font-variant-numeric:tabular-nums] shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-primary-500/40 sm:text-base"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-slate-700">{t(language, 'toDate')}</label>
                      <input
                        type="date"
                        value={noDeliveryEndDate}
                        onChange={e => { setNoDeliveryEndDate(e.target.value); setNoDeliveryError(''); }}
                        className="w-full rounded-[1.4rem] border border-white/60 bg-white/45 px-4 pr-11 py-3.5 text-[15px] text-slate-800 [font-variant-numeric:tabular-nums] shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-primary-500/40 sm:text-base"
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">{t(language, 'dateLabel')}</label>
                    <input
                      type="date"
                      value={noDeliveryStartDate}
                      onChange={e => { setNoDeliveryStartDate(e.target.value); setNoDeliveryError(''); }}
                      className="w-full rounded-[1.4rem] border border-white/60 bg-white/45 px-4 pr-11 py-3.5 text-[15px] text-slate-800 [font-variant-numeric:tabular-nums] shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-primary-500/40 sm:text-base"
                    />
                  </div>
                )}
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">{t(language, 'customer')}</label>
                  <select
                    required
                    value={selectedCustomerId}
                    onChange={e => { setSelectedCustomerId(e.target.value); setNoDeliveryError(''); }}
                    className="w-full rounded-[1.4rem] border border-white/60 bg-white/45 px-4 py-3.5 text-slate-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-primary-500/40"
                  >
                    <option value="" disabled>Select Customer</option>
                    {customers.map(customer => (
                      <option key={customer.id} value={customer.id}>{customer.name}</option>
                    ))}
                  </select>
                </div>
                <Button type="submit" disabled={isSubmitting} className="mt-2 h-14 w-full rounded-[1.6rem] shadow-[0_12px_30px_rgba(139,92,246,0.28)]">
                  {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : t(language, 'saveNoDelivery')}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
          </div>

          <div className="flex w-full min-w-0 max-w-full items-center justify-between gap-1 rounded-[1.25rem] border border-white/80 bg-white/60 p-1.5 shadow-sm backdrop-blur-sm xl:w-auto xl:min-w-[210px] xl:justify-start">
            <button onClick={handlePrevDay} className="p-1.5 hover:bg-white rounded-xl transition-colors text-slate-500 hover:text-slate-800">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex min-w-0 flex-1 items-center justify-center px-1 xl:flex-initial">
              <input 
                type="date" 
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full min-w-0 max-w-[150px] cursor-pointer border-none bg-transparent text-center font-medium text-slate-700 focus:outline-none xl:max-w-[135px]"
              />
            </div>
            <button onClick={handleNextDay} className="p-1.5 hover:bg-white rounded-xl transition-colors text-slate-500 hover:text-slate-800">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white/40 dark:bg-slate-900/60 backdrop-blur-xl rounded-[2rem] border border-white/60 dark:border-slate-700/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-4 sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center mb-6 min-w-0">
            <h3 className="font-bold text-lg text-slate-800 dark:text-white">
              {date === todayStr 
                ? t(language, 'todaysCollection') 
                : date === yesterdayStr 
                  ? (language === 'mr' ? 'कालचे संकलन' : "Yesterday's Collection")
                  : (language === 'mr' ? `${date.split('-').reverse().join('/')} चे संकलन` : `Collection for ${date.split('-').reverse().join('/')}`)}
            </h3>
            <div className="flex gap-4 self-start sm:self-auto">
              <div className="text-right">
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">{t(language, 'totalLiters')}</p>
                <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{totalLiters.toFixed(1)} L</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">{t(language, 'totalValue')}</p>
                <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">₹{totalAmount.toFixed(2)}</p>
              </div>
            </div>
          </div>

          {totalOverridesCount > 0 && (
            <div className="mb-6">
              <button 
                onClick={() => setIsOverridesExpanded(!isOverridesExpanded)}
                className="flex w-full items-center justify-between rounded-[1.6rem] border border-orange-200 bg-orange-50/90 px-4 py-3 text-orange-800 transition-colors hover:bg-orange-100"
              >
                <div className="flex min-w-0 items-center gap-2 text-sm font-semibold">
                  <AlertCircle className="h-4 w-4 shrink-0 text-orange-600" />
                  <span className="truncate">
                    {totalOverridesCount} {t(language, 'activeOverrides')}
                  </span>
                  <span className="hidden text-orange-600/70 sm:inline">{t(language, 'clickToManage')}</span>
                </div>
                <ChevronDown className={`h-5 w-5 shrink-0 text-orange-600 transition-transform duration-200 ${isOverridesExpanded ? 'rotate-180' : ''}`} />
              </button>

              {isOverridesExpanded && (
                <div className="mt-3 grid grid-cols-1 gap-4 rounded-[1.8rem] border border-slate-100 bg-slate-50/60 p-3 backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/30">
                  {activeNoDeliveryCustomers.length > 0 && (
                    <div className="rounded-[1.6rem] border border-rose-100 bg-rose-50/70 p-3">
                      <button
                        type="button"
                        onClick={() => setIsNoDeliveryExpanded(!isNoDeliveryExpanded)}
                        className="flex w-full items-center justify-between gap-3 text-left"
                      >
                        <div className="flex min-w-0 items-center gap-2 text-sm font-semibold text-rose-900">
                          <Ban className="h-4 w-4 shrink-0" />
                          <span className="truncate">{t(language, 'noDeliveryActive')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="rounded-full bg-white/80 px-2.5 py-1 text-xs font-bold text-rose-700">
                            {activeNoDeliveryCustomers.length}
                          </span>
                          <ChevronDown className={`h-4 w-4 shrink-0 text-rose-700 transition-transform duration-200 ${isNoDeliveryExpanded ? 'rotate-180' : ''}`} />
                        </div>
                      </button>
                      {isNoDeliveryExpanded && (
                      <div className="mt-3 space-y-2">
                        {activeNoDeliveryCustomers.map(customer => {
                          const upcomingDates = (customer.skippedDates || []).filter(d => d >= todayStr).sort();
                          const startDate = upcomingDates[0];
                          const endDate = upcomingDates[upcomingDates.length - 1];

                          const formatDate = (dateString: string) => {
                            if (!dateString) return '';
                            const [year, month, day] = dateString.split('-');
                            return `${day}/${month}/${year}`;
                          };

                          const isSameDay = startDate === endDate;
                          const dateText = isSameDay
                            ? formatDate(startDate)
                            : `${formatDate(startDate)} to ${formatDate(endDate)}`;

                          return (
                            <div key={customer.id} className="rounded-[1.25rem] border border-rose-100/80 bg-white/70 p-3 shadow-[0_6px_18px_rgba(15,23,42,0.04)]">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <p className="truncate text-sm font-bold text-slate-800">{customer.name}</p>
                                    <span className="shrink-0 rounded-full bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-700">0 L</span>
                                  </div>
                                  <div className="mt-1 flex items-start gap-1.5 text-xs text-slate-500">
                                    <CalendarIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                    <span className="leading-5 break-words">{dateText}</span>
                                  </div>
                                </div>
                                <div className="flex shrink-0 items-center gap-1 rounded-full bg-slate-100/80 p-1">
                                  <button
                                    onClick={() => handleEditNoDelivery(customer)}
                                    className="rounded-full p-2 text-blue-600 transition-colors hover:bg-blue-100"
                                    title="Edit"
                                  >
                                    <PencilLine className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleRemoveNoDelivery(customer.id)}
                                    className="rounded-full p-2 text-red-500 transition-colors hover:bg-red-100"
                                    title="Turn Off"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                      )}
                    </div>
                  )}

                  {activeSpecialConditions.length > 0 && (
                    <div className="rounded-[1.6rem] border border-blue-100 bg-blue-50/70 p-3">
                      <button
                        type="button"
                        onClick={() => setIsSpecialQuantitiesExpanded(!isSpecialQuantitiesExpanded)}
                        className="flex w-full items-center justify-between gap-3 text-left"
                      >
                        <div className="flex min-w-0 items-center gap-2 text-sm font-semibold text-blue-900">
                          <PencilLine className="h-4 w-4 shrink-0" />
                          <span className="truncate">{t(language, 'activeSpecialQuantities')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="rounded-full bg-white/80 px-2.5 py-1 text-xs font-bold text-blue-700">
                            {activeSpecialConditions.length}
                          </span>
                          <ChevronDown className={`h-4 w-4 shrink-0 text-blue-700 transition-transform duration-200 ${isSpecialQuantitiesExpanded ? 'rotate-180' : ''}`} />
                        </div>
                      </button>
                      {isSpecialQuantitiesExpanded && (
                      <div className="mt-3 space-y-2">
                        {activeSpecialConditions.map(customer => {
                          const cond = customer.specialCondition!;
                          const formatDate = (dateString: string) => {
                            const [year, month, day] = dateString.split('-');
                            return `${day}/${month}/${year}`;
                          };
                          const isSameDay = cond.startDate === cond.endDate;
                          const dateText = isSameDay
                            ? formatDate(cond.startDate)
                            : `${formatDate(cond.startDate)} to ${formatDate(cond.endDate)}`;

                          return (
                            <div key={customer.id} className="rounded-[1.25rem] border border-blue-100/80 bg-white/70 p-3 shadow-[0_6px_18px_rgba(15,23,42,0.04)]">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <p className="truncate text-sm font-bold text-slate-800">{customer.name}</p>
                                    <span className="shrink-0 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-700">{cond.quantity} L</span>
                                  </div>
                                  <div className="mt-1 flex items-start gap-1.5 text-xs text-slate-500">
                                    <CalendarIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                    <span className="leading-5 break-words">{dateText}</span>
                                  </div>
                                </div>
                                <div className="flex shrink-0 items-center gap-1 rounded-full bg-slate-100/80 p-1">
                                  <button
                                    onClick={() => handleEditSpecialCondition(customer)}
                                    className="rounded-full p-2 text-blue-600 transition-colors hover:bg-blue-100"
                                    title="Edit"
                                  >
                                    <PencilLine className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleTurnOffSpecialCondition(customer.id)}
                                    className="rounded-full p-2 text-red-500 transition-colors hover:bg-red-100"
                                    title="Turn Off"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200/60 dark:border-slate-600 text-slate-500 dark:text-slate-300 text-sm">
                    <th className="pb-3 px-4 font-medium min-w-[120px] whitespace-nowrap">{t(language, 'customer')}</th>
                    <th className="pb-3 px-4 font-medium text-center whitespace-nowrap">{t(language, 'morning')}</th>
                    <th className="pb-3 px-4 font-medium text-center whitespace-nowrap">{t(language, 'evening')}</th>
                    <th className="pb-3 px-4 font-medium text-right whitespace-nowrap">{t(language, 'amountRs')}</th>
                    <th className="pb-3 px-4 font-medium text-right whitespace-nowrap">{t(language, 'actions')}</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {allDisplayEntries.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-500 dark:text-slate-300">{t(language, 'noEntries')}</td>
                    </tr>
                  ) : (
                    allDisplayEntries.map((entry) => (
                      <tr key={entry.id} className="border-b border-slate-100 dark:border-slate-800/50 last:border-0 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="py-2 px-4 whitespace-nowrap">
                           <span className="font-medium text-slate-800 dark:text-slate-200">{entry.customerName}</span>
                        </td>
                        <td className="py-2 px-4 text-center whitespace-nowrap">
                          <span className={entry.morningQuantity > 0 ? "font-bold text-blue-600" : "text-slate-400"}>
                            {entry.morningQuantity > 0 ? `${entry.morningQuantity} L` : '-'}
                          </span>
                        </td>
                        <td className="py-2 px-4 text-center whitespace-nowrap">
                          <span className={entry.eveningQuantity > 0 ? "font-bold text-indigo-600" : "text-slate-400"}>
                            {entry.eveningQuantity > 0 ? `${entry.eveningQuantity} L` : '-'}
                          </span>
                        </td>
                        <td className="py-2 px-4 text-right font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                          {entry.totalAmount}
                        </td>
                        <td className="py-2 px-4 text-right whitespace-nowrap">
                          <div className="flex justify-end gap-1">
                            {(entry as any).isVirtualSkipped ? (
                              <span className="inline-flex items-center gap-1 bg-rose-100 text-rose-700 px-2 py-1 rounded-lg text-xs font-semibold">
                                <Ban className="w-3 h-3" />
                                {t(language, 'noDelivery')}
                              </span>
                            ) : (
                              <>
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
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>

          {/* Mobile Scrollable Table View */}
          <div className="md:hidden mt-4">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
              </div>
            ) : allDisplayEntries.length === 0 ? (
              <div className="py-8 text-center text-slate-500">{t(language, 'noEntries')}</div>
            ) : (
              <div className="overflow-x-auto pb-2 [-webkit-overflow-scrolling:touch]">
                <table className="min-w-[720px] w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-slate-200/60 text-sm text-slate-500 dark:border-slate-600 dark:text-slate-300">
                      <th className="pb-3 px-4 font-medium whitespace-nowrap">{t(language, 'customer')}</th>
                      <th className="pb-3 px-4 font-medium text-center whitespace-nowrap">{t(language, 'morning')}</th>
                      <th className="pb-3 px-4 font-medium text-center whitespace-nowrap">{t(language, 'evening')}</th>
                      <th className="pb-3 px-4 font-medium text-right whitespace-nowrap">{t(language, 'amountRs')}</th>
                      <th className="pb-3 px-4 font-medium text-right whitespace-nowrap">{t(language, 'actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {allDisplayEntries.map((entry) => (
                      <tr key={`mobile-${entry.id}`} className="border-b border-slate-100 transition-colors last:border-0 hover:bg-slate-50/50 dark:border-slate-800/50 dark:hover:bg-slate-800/50">
                        <td className="py-2 px-4 whitespace-nowrap">
                          <span className="font-medium text-slate-800 dark:text-slate-200">{entry.customerName}</span>
                        </td>
                        <td className="py-2 px-4 text-center whitespace-nowrap">
                          <span className={entry.morningQuantity > 0 ? "font-bold text-blue-600" : "text-slate-400"}>
                            {entry.morningQuantity > 0 ? `${entry.morningQuantity} L` : '-'}
                          </span>
                        </td>
                        <td className="py-2 px-4 text-center whitespace-nowrap">
                          <span className={entry.eveningQuantity > 0 ? "font-bold text-indigo-600" : "text-slate-400"}>
                            {entry.eveningQuantity > 0 ? `${entry.eveningQuantity} L` : '-'}
                          </span>
                        </td>
                        <td className="py-2 px-4 text-right font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                          {entry.totalAmount}
                        </td>
                        <td className="py-2 px-4 text-right whitespace-nowrap">
                          <div className="flex justify-end gap-1">
                            {(entry as any).isVirtualSkipped ? (
                              <span className="inline-flex items-center gap-1 rounded-lg bg-rose-100 px-2 py-1 text-xs font-semibold text-rose-700">
                                <Ban className="w-3 h-3" />
                                {t(language, 'noDelivery')}
                              </span>
                            ) : (
                              <>
                                <Button
                                  variant="ghost" size="icon"
                                  className="h-8 w-8 rounded-lg text-blue-600 hover:bg-blue-50"
                                  onClick={() => openEditDialog(entry)}
                                >
                                  <SquarePen className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost" size="icon"
                                  className="h-8 w-8 rounded-lg text-red-500 hover:bg-red-50"
                                  onClick={() => setDeleteConfirmId(entry.id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost" size="icon"
                                  className="h-8 w-8 rounded-lg text-green-600 hover:bg-green-50"
                                  onClick={() => {
                                    const totalQty = entry.morningQuantity + entry.eveningQuantity;
                                    const text = `नमस्कार ${entry.customerName},%0A%0Aआजची तुमची दूध नोंद:%0Aसकाळ: ${entry.morningQuantity > 0 ? entry.morningQuantity + 'L' : '-'}%0Aसंध्याकाळ: ${entry.eveningQuantity > 0 ? entry.eveningQuantity + 'L' : '-'}%0Aएकूण: ${totalQty} L%0Aरक्कम: ₹${entry.totalAmount}%0A%0A- घरचं दूध (Gharcha Dudh)`;
                                    window.open(`https://wa.me/?text=${text}`, '_blank');
                                  }}
                                >
                                  <MessageCircle className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
