import { useState, useEffect, useMemo } from 'react'
import { Plus, Search, Trash, Clock, PencilLine, Ban, Mic, MicOff, Play, ChevronDown, ChevronUp, Eye } from 'lucide-react'
import toast from 'react-hot-toast'
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
import { LoadingBlock, LoadingInline } from '../components/ui/loading'
import { useSettingsStore } from '../store/settingsStore'
import { t } from '../utils/translations'
import { getDisplayLocale } from '../utils/numberFormat'
import { setCachedCustomers } from '../lib/customerCache'
import { CustomerDetailsDialog } from '../components/customers/CustomerDetailsDialog'

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
  autoEntryEnabled: boolean
  defaultMorningQuantity: number
  defaultEveningQuantity: number
  active: boolean
  stoppedAt?: string | null
  deliveryOverrides?: Array<{
    date: string
    quantity: number
  }>
  specialCondition?: {
    startDate: string
    endDate: string
    quantity: number
    active: boolean
  } | null
}

interface MilkEntrySummary {
  date: string
  morningQuantity: number
  eveningQuantity: number
  totalAmount?: number
}

interface CustomerRecentEntry {
  date: string | null
  quantity: number
  amount: number
  isSkipped: boolean
}

export default function Customers() {
  const { language } = useSettingsStore()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [recentEntriesByCustomer, setRecentEntriesByCustomer] = useState<Record<string, CustomerRecentEntry>>({})
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [deletingCustomerId, setDeletingCustomerId] = useState<string | null>(null)
  const [togglingCustomerId, setTogglingCustomerId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [isStoppedExpanded, setIsStoppedExpanded] = useState(false)
  const [viewingCustomer, setViewingCustomer] = useState<Customer | null>(null)
  
  const emptyForm = {
    name: '',
    phone: '',
    address: '',
    milkType: 'BUFFALO',
    ratePerLiter: '70',
    dailyQuantity: '1',
    autoEntryEnabled: true,
    defaultMorningQuantity: '0',
    defaultEveningQuantity: '0',
  }
  const [formData, setFormData] = useState(emptyForm)
  const effectiveDailyQuantity = parseFloat(formData.dailyQuantity || '0') || 0
  const effectiveRate = parseFloat(formData.ratePerLiter || '0') || 0
  const estimatedAmount = effectiveDailyQuantity * effectiveRate
  const todayStr = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`

  const fetchCustomers = async () => {
    try {
      const res = await axios.get('/api/customers')
      if (res.data.success) {
        setCustomers(res.data.data)
        setCachedCustomers(res.data.data)
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

  useEffect(() => {
    if (customers.length === 0) {
      setRecentEntriesByCustomer({})
      return
    }

    const fetchRecentEntries = async () => {
      try {
        const responses = await Promise.all(
          customers.map((customer) =>
            axios.get('/api/milk-entries/customer-range', {
              params: {
                customerId: customer.id,
                startDate: '2000-01-01',
                endDate: '2100-01-01',
              },
            })
          )
        )

        const nextRecentEntries = customers.reduce<Record<string, CustomerRecentEntry>>((acc, customer, index) => {
          const customerEntries = (responses[index].data?.data ?? []) as MilkEntrySummary[]
          const latestEntryDate = customerEntries.reduce<string | null>((latestDate, entry) => {
            const currentDate = entry.date?.slice(0, 10) ?? null
            if (!currentDate) return latestDate
            if (!latestDate || currentDate > latestDate) return currentDate
            return latestDate
          }, null)
          const latestDateEntries = latestEntryDate
            ? customerEntries.filter((entry) => entry.date?.slice(0, 10) === latestEntryDate)
            : []
          const latestSkippedDate = [...(customer.skippedDates ?? [])].sort().at(-1) ?? null
          const shouldShowSkippedAsLatest =
            !!latestSkippedDate && (!latestEntryDate || latestSkippedDate >= latestEntryDate)

          acc[customer.id] = shouldShowSkippedAsLatest
            ? {
                date: latestSkippedDate,
                quantity: 0,
                amount: 0,
                isSkipped: true,
              }
            : latestDateEntries.length > 0
              ? {
                  date: latestEntryDate,
                  quantity: latestDateEntries.reduce(
                    (sum, entry) => sum + (entry.morningQuantity || 0) + (entry.eveningQuantity || 0),
                    0
                  ),
                  amount: latestDateEntries.reduce((sum, entry) => sum + Number(entry.totalAmount || 0), 0),
                  isSkipped: false,
                }
              : {
                date: null,
                quantity: 0,
                amount: 0,
                isSkipped: false,
              }

          return acc
        }, {})

        setRecentEntriesByCustomer(nextRecentEntries)
      } catch (err) {
        console.error(err)
      }
    }

    void fetchRecentEntries()
  }, [customers])

  const startVoiceTyping = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error(language === 'mr' ? 'तुमच्या ब्राउझरला व्हॉइस टायपिंगचा सपोर्ट नाही.' : 'Your browser does not support voice typing.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = language === 'mr' ? 'mr-IN' : 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      // remove trailing period if any
      const cleaned = transcript.replace(/\.$/, '');
      setFormData(prev => ({ ...prev, name: cleaned }));
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error', event.error);
      setIsListening(false);
      if (event.error !== 'no-speech') {
        toast.error(language === 'mr' ? 'आवाज ओळखता आला नाही. पुन्हा प्रयत्न करा.' : 'Voice not recognized. Try again.');
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const handleSubmitCustomer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSubmitting) return;
    if (!editingId) {
      const isDuplicate = customers.some(c => c.name.trim().toLowerCase() === formData.name.trim().toLowerCase())
      if (isDuplicate) {
        toast.error("Customer with this name already exists")
        return
      }
    }

    setIsSubmitting(true)
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
          const nextCustomers = customers.map(c => c.id === editingId ? res.data.data : c)
          setCustomers(nextCustomers)
          setCachedCustomers(nextCustomers)
        }
      } else {
        const res = await axios.post('/api/customers', payload)
        if (res.data.success) {
          const nextCustomers = [...customers, res.data.data]
          setCustomers(nextCustomers)
          setCachedCustomers(nextCustomers)
        }
      }
      
      setIsDialogOpen(false)
      setEditingId(null)
      setFormData(emptyForm)
    } catch (err: any) {
      console.error(err)
      const errorMsg = err.response?.data?.message || t(language, 'failedSaveCustomer')
      toast.error(errorMsg)
    } finally {
      setIsSubmitting(false)
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
    if (!deleteConfirmId || deletingCustomerId) return

    const customerId = deleteConfirmId
    const previousCustomers = customers

    setDeletingCustomerId(customerId)
    const nextCustomers = customers.filter((customer) => customer.id !== customerId)
    setCustomers(nextCustomers)
    setCachedCustomers(nextCustomers)
    setDeleteConfirmId(null)

    try {
      const res = await axios.delete(`/api/customers/${customerId}`)
      if (!res.data.success) {
        setCustomers(previousCustomers)
        setCachedCustomers(previousCustomers)
        toast.error(t(language, 'failedDeleteCustomer'))
      }
    } catch (err: any) {
      console.error(err)
      setCustomers(previousCustomers)
      setCachedCustomers(previousCustomers)
      toast.error(t(language, 'failedDeleteCustomer'))
    } finally {
      setDeletingCustomerId(null)
    }
  }

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.phone.includes(search)
  )
  const activeCustomers = filteredCustomers.filter((customer) => customer.active)
  const stoppedCustomers = filteredCustomers
    .filter((customer) => !customer.active)
    .sort((a, b) => new Date(b.stoppedAt || 0).getTime() - new Date(a.stoppedAt || 0).getTime())
  const totalCustomerMilk = useMemo(
    () => activeCustomers.reduce((sum, customer) => sum + (recentEntriesByCustomer[customer.id]?.quantity || 0), 0),
    [activeCustomers, recentEntriesByCustomer]
  )
  const totalCustomerBalance = useMemo(
    () => activeCustomers.reduce((sum, customer) => sum + (customer.balance || 0), 0),
    [activeCustomers]
  )
  const totalRecentAmount = useMemo(
    () => activeCustomers.reduce((sum, customer) => sum + (recentEntriesByCustomer[customer.id]?.amount || 0), 0),
    [activeCustomers, recentEntriesByCustomer]
  )
  const sharedRecentEntryDate = useMemo(() => {
    if (activeCustomers.length === 0) return null

    const datedCustomers = activeCustomers
      .map((customer) => recentEntriesByCustomer[customer.id]?.date ?? null)
      .filter((date): date is string => Boolean(date))

    if (datedCustomers.length !== activeCustomers.length) return null

    const firstDate = datedCustomers[0]
    return datedCustomers.every((date) => date === firstDate) ? firstDate : null
  }, [activeCustomers, recentEntriesByCustomer])

  const formatStoppedAt = (value?: string | null) => {
    if (!value) return '-'
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return '-'
    return new Intl.DateTimeFormat(getDisplayLocale(language), {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(parsed)
  }

  const formatEntryDate = (value?: string | null) => {
    if (!value) return t(language, 'noEntry')
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return value
    return new Intl.DateTimeFormat(getDisplayLocale(language), {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(parsed)
  }

  const hasPendingSpecialQuantity = (customer: Customer) => {
    const pendingOverrideExists = (customer.deliveryOverrides ?? []).some((override) => override.date >= todayStr)
    if (pendingOverrideExists) return true

    const condition = customer.specialCondition
    if (!condition || !condition.active) return false
    return condition.endDate >= todayStr
  }

  const hasPendingNoDelivery = (customer: Customer) => {
    return (customer.skippedDates ?? []).some((skippedDate) => skippedDate >= todayStr)
  }

  const handleToggleCustomerStatus = async (customer: Customer) => {
    if (togglingCustomerId) return

    const nextActive = !customer.active
    setTogglingCustomerId(customer.id)

    try {
      const res = await axios.patch(`/api/customers/${customer.id}/status?active=${nextActive}`)
      if (res.data.success) {
        const nextCustomers = customers.map((currentCustomer) =>
          currentCustomer.id === customer.id ? { ...currentCustomer, ...res.data.data } : currentCustomer
        )
        setCustomers(nextCustomers)
        setCachedCustomers(nextCustomers)
        toast.success(nextActive ? t(language, 'customerResumed') : t(language, 'customerStopped'))
      }
    } catch (err) {
      console.error(err)
      toast.error(t(language, 'failedUpdateCustomerStatus'))
    } finally {
      setTogglingCustomerId(null)
    }
  }

  const getMilkTypeLabel = (milkType: string) => {
    if (milkType === 'COW') return t(language, 'cow')
    if (milkType === 'BUFFALO') return t(language, 'buffalo')
    return milkType
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-800 dark:text-white">{t(language, 'customersTitle')}</h1>
          <p className="text-slate-500 dark:text-slate-300 font-medium mt-1">{t(language, 'customersDesc')}</p>
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
              <DialogDescription className="px-6 text-slate-500">
                {editingId ? t(language, 'editCustomerDesc') : t(language, 'addCustomerDesc')}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmitCustomer} className="space-y-5 px-6 pb-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t(language, 'name')}</label>
                  <div className="relative">
                    <input 
                      required type="text" value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      className="w-full pl-4 pr-12 py-3 border border-slate-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                    <button
                      type="button"
                      onClick={startVoiceTyping}
                      className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-xl transition-colors ${isListening ? 'text-rose-500 bg-rose-50 animate-pulse' : 'text-slate-400 hover:text-primary-600 hover:bg-slate-50'}`}
                      title={t(language, 'voiceTyping')}
                    >
                      {isListening ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                    </button>
                  </div>
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
                    <span className="font-medium">{t(language, 'calculation')}</span>
                    <span className="font-semibold">
                      {effectiveDailyQuantity.toFixed(1)} L x ₹{effectiveRate.toFixed(2)}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-sm text-slate-600">{t(language, 'estimatedAmount')}</span>
                    <span className="text-xl font-bold text-emerald-700">₹{estimatedAmount.toFixed(2)}</span>
                  </div>
                </div>
              </div>
              <Button type="submit" disabled={isSubmitting} className="w-full rounded-2xl py-6 text-lg font-bold shadow-lg">
                {isSubmitting ? (
                  <LoadingInline label={language === 'mr' ? 'सेव्ह होत आहे...' : 'Saving...'} />
                ) : (
                  editingId ? t(language, 'updateCustomer') : t(language, 'saveCustomer')
                )}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        <ConfirmDialog 
          isOpen={!!deleteConfirmId}
          onClose={() => setDeleteConfirmId(null)}
          onConfirm={handleDeleteCustomer}
          isProcessing={!!deletingCustomerId}
          title={t(language, 'confirmDeletionTitle')}
          description={t(language, 'deleteConfirm')}
          confirmText={t(language, 'delete')}
          cancelText={t(language, 'cancel')}
        />
      </div>

      <div className="bg-white/40 dark:bg-slate-900/60 backdrop-blur-xl rounded-[2rem] border border-white/60 dark:border-slate-700/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-4 sm:p-8">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <h2 className="text-xl font-extrabold text-slate-800 dark:text-white">{t(language, 'activeCustomerList')}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-300">{activeCustomers.length}</p>
          </div>
          <div className="relative w-full md:w-80 md:min-w-[20rem]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder={t(language, 'searchCustomers')} 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-full border border-white/60 bg-white/40 py-2 pl-10 pr-4 text-sm shadow-[0_2px_10px_rgb(0,0,0,0.02)] backdrop-blur-md transition-all focus:bg-white/80 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-slate-700/80 dark:bg-slate-900/60 dark:text-white dark:focus:bg-slate-800"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          {isLoading ? (
            <LoadingBlock label={t(language, 'loadingCustomers')} minHeightClassName="min-h-[220px]" size="md" />
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200/60 dark:border-slate-600 text-slate-500 dark:text-slate-300 text-sm">
                  <th className="pb-3 px-4 font-medium whitespace-nowrap">{t(language, 'name')}</th>
                  <th className="pb-3 px-4 font-medium whitespace-nowrap">
                    <div className="flex flex-col">
                      <span>{t(language, 'recentEntry')}</span>
                      {sharedRecentEntryDate && (
                        <span className="text-[11px] font-medium text-slate-400 dark:text-slate-400">
                          {formatEntryDate(sharedRecentEntryDate)}
                        </span>
                      )}
                    </div>
                  </th>
                  <th className="pb-3 px-4 font-medium text-right whitespace-nowrap">{t(language, 'currentBalance')} (₹)</th>
                  <th className="pb-3 px-4 font-medium text-right whitespace-nowrap">{t(language, 'actions')}</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {activeCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-500 dark:text-slate-300">{t(language, 'noCustomersFound')}</td>
                  </tr>
                ) : (
                  activeCustomers.map((customer) => (
                    <tr key={customer.id} className="border-b border-slate-100 dark:border-slate-800/50 last:border-0 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-xs">
                            {customer.name.charAt(0)}
                          </div>
                          <span className="font-medium text-slate-800 dark:text-slate-200">{customer.name}</span>
                          {!customer.active && (
                            <span className="ml-2 inline-flex items-center rounded-md bg-slate-200 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-700">
                              {t(language, 'inactive')}
                            </span>
                          )}
                          {customer.autoEntryEnabled && (
                            <span className="ml-2 inline-flex items-center gap-1 rounded-md bg-indigo-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-700" title={t(language, 'autoEntry930')}>
                              <Clock className="w-3 h-3" /> Auto
                            </span>
                          )}
                          {hasPendingSpecialQuantity(customer) && (
                            <span className="ml-2 inline-flex items-center gap-1 rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700" title={t(language, 'specialQuantityActive')}>
                              <PencilLine className="w-3 h-3" /> {t(language, 'specialQtyShort')}
                            </span>
                          )}
                          {hasPendingNoDelivery(customer) && (
                            <span className="ml-2 inline-flex items-center gap-1 rounded-md bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-rose-700" title={t(language, 'noDeliveryToday')}>
                              <Ban className="w-3 h-3" /> {t(language, 'skipShort')}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap text-slate-600 dark:text-slate-300">
                        <div className="flex flex-col">
                          {recentEntriesByCustomer[customer.id]?.date && recentEntriesByCustomer[customer.id]?.date !== sharedRecentEntryDate ? (
                            <span className="font-medium text-slate-800 dark:text-slate-200">
                              {formatEntryDate(recentEntriesByCustomer[customer.id]?.date)}
                            </span>
                          ) : null}
                          {!recentEntriesByCustomer[customer.id]?.date ? (
                            <span className="font-medium text-slate-800 dark:text-slate-200">
                              {formatEntryDate(recentEntriesByCustomer[customer.id]?.date)}
                            </span>
                          ) : null}
                          <span className="text-xs text-slate-400">
                            {getMilkTypeLabel(customer.milkType)}
                          </span>
                          {recentEntriesByCustomer[customer.id]?.isSkipped && (
                            <span className="inline-flex w-fit items-center gap-1 rounded-md bg-rose-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-rose-700">
                              <Ban className="h-3 w-3" /> {t(language, 'skipShort')}
                            </span>
                          )}
                          <span className="text-xs font-semibold text-slate-500 dark:text-slate-300">
                            {t(language, 'milkLabel')}: 
                            {(recentEntriesByCustomer[customer.id]?.quantity ?? 0).toFixed(1)} L
                          </span>
                          <span className="text-xs font-semibold text-slate-500 dark:text-slate-300">
                            {t(language, 'amountLabel')}: 
                            ₹{(recentEntriesByCustomer[customer.id]?.amount ?? 0).toFixed(2)}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-right font-medium whitespace-nowrap">
                        <span className={customer.balance > 0 ? 'text-emerald-600 dark:text-emerald-400' : customer.balance < 0 ? 'text-red-500 dark:text-red-400' : 'text-slate-600 dark:text-slate-300'}>
                          {customer.balance}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right whitespace-nowrap">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={togglingCustomerId === customer.id}
                          onClick={() => handleToggleCustomerStatus(customer)}
                          className={customer.active ? 'text-amber-600 hover:text-amber-700' : 'text-emerald-600 hover:text-emerald-700'}
                        >
                          {togglingCustomerId === customer.id ? (
                            <LoadingInline label="" className="gap-0" />
                          ) : customer.active ? (
                            <>
                              <Ban className="mr-1 h-4 w-4" />
                              {t(language, 'stopCustomer')}
                            </>
                          ) : (
                            <>
                              <Play className="mr-1 h-4 w-4" />
                              {t(language, 'resumeCustomer')}
                            </>
                          )}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setViewingCustomer(customer)} className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 ml-1">
                          <Eye className="w-4 h-4 mr-1" />
                          {t(language, 'view')}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleEditClick(customer)} className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 ml-1">{t(language, 'edit')}</Button>
                        <Button variant="ghost" size="sm" onClick={() => setDeleteConfirmId(customer.id)} className="text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30 ml-2 rounded-full">
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

        <div className="mt-6 rounded-[1.75rem] border border-white/70 bg-white/45 p-4 shadow-[0_8px_24px_rgba(15,23,42,0.05)] backdrop-blur-xl dark:border-slate-700/80 dark:bg-slate-900/60">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center justify-between gap-3 sm:min-w-72">
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-300">{t(language, 'totalCustomerMilk')}</p>
              <p className="text-2xl font-extrabold text-primary-700 dark:text-primary-300">{totalCustomerMilk.toFixed(1)} L</p>
            </div>
            <div className="flex items-center justify-between gap-3 sm:min-w-72">
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-300">{t(language, 'totalRecentAmount')}</p>
              <p className="text-2xl font-extrabold text-blue-600 dark:text-blue-400">
                ₹{totalRecentAmount.toFixed(2)}
              </p>
            </div>
            <div className="flex items-center justify-between gap-3 sm:min-w-72">
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-300">{t(language, 'totalBalance')}</p>
              <p className={`text-2xl font-extrabold ${totalCustomerBalance > 0 ? 'text-emerald-600 dark:text-emerald-400' : totalCustomerBalance < 0 ? 'text-red-500 dark:text-red-400' : 'text-slate-700 dark:text-slate-200'}`}>
                ₹{totalCustomerBalance.toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white/40 dark:bg-slate-900/60 backdrop-blur-xl rounded-[2rem] border border-white/60 dark:border-slate-700/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-4 sm:p-8">
        <button
          type="button"
          onClick={() => setIsStoppedExpanded((prev) => !prev)}
          className="mb-4 flex w-full items-center justify-between gap-3 rounded-[1.5rem] bg-white/35 px-4 py-3 text-left transition hover:bg-white/55 dark:bg-slate-900/40 dark:hover:bg-slate-900/60"
        >
          <div>
            <h2 className="text-xl font-extrabold text-slate-800 dark:text-white">{t(language, 'stoppedCustomers')}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-300">
              {stoppedCustomers.length} • {isStoppedExpanded ? t(language, 'clickToCollapse') : t(language, 'clickToExpand')}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex min-w-10 justify-center rounded-full bg-slate-100 px-3 py-1 text-sm font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-100">
              {stoppedCustomers.length}
            </span>
            {isStoppedExpanded ? (
              <ChevronUp className="h-5 w-5 text-slate-500 dark:text-slate-300" />
            ) : (
              <ChevronDown className="h-5 w-5 text-slate-500 dark:text-slate-300" />
            )}
          </div>
        </button>

        {isStoppedExpanded && (
          stoppedCustomers.length === 0 ? (
            <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-white/50 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300">
              {t(language, 'noStoppedCustomers')}
            </div>
          ) : (
            <div className="max-h-[28rem] overflow-auto rounded-[1.5rem] border border-slate-200/70 bg-white/60 dark:border-slate-700/80 dark:bg-slate-900/40">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 z-10 bg-white/95 backdrop-blur dark:bg-slate-900/95">
                  <tr className="border-b border-slate-200/70 dark:border-slate-700 text-sm text-slate-500 dark:text-slate-300">
                    <th className="px-4 py-3 font-medium whitespace-nowrap">{t(language, 'name')}</th>
                    <th className="px-4 py-3 font-medium whitespace-nowrap">{t(language, 'stoppedOn')}</th>
                    <th className="px-4 py-3 font-medium whitespace-nowrap">{t(language, 'milkType')}</th>
                    <th className="px-4 py-3 font-medium whitespace-nowrap">{t(language, 'dailyQuantity')}</th>
                    <th className="px-4 py-3 font-medium text-right whitespace-nowrap">{t(language, 'currentBalance')} (₹)</th>
                    <th className="px-4 py-3 font-medium text-right whitespace-nowrap">{t(language, 'actions')}</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {stoppedCustomers.map((customer) => (
                    <tr key={customer.id} className="border-b border-slate-100 dark:border-slate-800/60 last:border-0 hover:bg-slate-50/60 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs dark:bg-slate-700 dark:text-slate-100">
                            {customer.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium text-slate-800 dark:text-slate-100">{customer.name}</p>
                            <span className="inline-flex rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-700 dark:bg-slate-700 dark:text-slate-100">
                              {t(language, 'inactive')}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-slate-600 dark:text-slate-300 whitespace-nowrap">{formatStoppedAt(customer.stoppedAt)}</td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-md text-xs font-medium ${customer.milkType === 'COW' ? 'bg-orange-100 text-orange-700' : 'bg-slate-200 text-slate-700'}`}>
                          {getMilkTypeLabel(customer.milkType)}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-slate-600 dark:text-slate-300 whitespace-nowrap">{customer.dailyQuantity} L</td>
                      <td className="px-4 py-4 text-right font-medium whitespace-nowrap">
                        <span className={customer.balance > 0 ? 'text-emerald-600 dark:text-emerald-400' : customer.balance < 0 ? 'text-red-500 dark:text-red-400' : 'text-slate-600 dark:text-slate-300'}>
                          {customer.balance}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right whitespace-nowrap">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={togglingCustomerId === customer.id}
                          onClick={() => handleToggleCustomerStatus(customer)}
                          className="text-emerald-600 hover:text-emerald-700"
                        >
                          {togglingCustomerId === customer.id ? (
                            <LoadingInline label="" className="gap-0" />
                          ) : (
                            <>
                              <Play className="mr-1 h-4 w-4" />
                              {t(language, 'resumeCustomer')}
                            </>
                          )}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setViewingCustomer(customer)} className="text-blue-600 hover:text-blue-700 ml-1">
                          <Eye className="w-4 h-4 mr-1" />
                          {t(language, 'view')}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleEditClick(customer)} className="text-primary-600 hover:text-primary-700 ml-1">
                          {t(language, 'edit')}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>
      
      <CustomerDetailsDialog
        customer={viewingCustomer}
        isOpen={!!viewingCustomer}
        onClose={() => setViewingCustomer(null)}
      />
    </div>
  )
}
