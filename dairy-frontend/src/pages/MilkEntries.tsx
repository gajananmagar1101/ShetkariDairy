import { useState, useEffect } from 'react'
import { Droplets, Calendar as CalendarIcon, Loader2, Mic, MessageCircle, Zap, Trash2 } from 'lucide-react'
import axios from 'axios'
import { Button } from '../components/ui/button'
import { useSettingsStore } from '../store/settingsStore'
import { t } from '../utils/translations'

interface Customer {
  id: string
  name: string
  milkType: string
  ratePerLiter: number
  dailyQuantity: number
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

  // Form State
  const [selectedCustomer, setSelectedCustomer] = useState('')
  const [morning, setMorning] = useState('')
  const [evening, setEvening] = useState('')
  const [fat, setFat] = useState('')
  const [snf, setSnf] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')

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

  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCustomer) {
      alert("Please select a customer first!")
      return
    }

    try {
      const payload = {
        customerId: selectedCustomer,
        date: date,
        morningQuantity: morning ? parseFloat(morning) : 0,
        eveningQuantity: evening ? parseFloat(evening) : 0,
        fat: fat ? parseFloat(fat) : null,
        snf: snf ? parseFloat(snf) : null
      }
      
      const res = await axios.post('/api/milk-entries', payload)
      if (res.data.success) {
        // Refresh entries
        fetchEntries(date)
        // Reset form
        setMorning('')
        setEvening('')
        setFat('')
        setSnf('')
      }
    } catch (err) {
      console.error(err)
      alert("Failed to save entry.")
    }
  }

  const handleAutoGenerate = async () => {
    if (!window.confirm("Auto-generate all regular daily entries for this date?")) return;
    
    setIsLoading(true);
    try {
      const res = await axios.post(`/api/milk-entries/auto-generate?date=${date}`);
      if (res.data.success) {
        alert(`Successfully generated ${res.data.data} entries!`);
        fetchEntries(date);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to auto-generate entries.");
    } finally {
      setIsLoading(false);
    }
  }

  const handleDeleteEntry = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this entry? This will adjust the customer's bill.")) return;

    try {
      const res = await axios.delete(`/api/milk-entries/${id}`);
      if (res.data.success) {
        fetchEntries(date);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to delete entry.");
    }
  }

  const startListening = () => {
    // @ts-ignore
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      alert("Your browser doesn't support Voice Entry. Please use Google Chrome.")
      return
    }

    const recognition = new SpeechRecognition()
    recognition.lang = 'mr-IN' // Marathi language
    recognition.interimResults = false

    recognition.onstart = () => {
      setIsListening(true)
      setTranscript('')
    }

    recognition.onresult = (event: any) => {
      const text = event.results[0][0].transcript.toLowerCase()
      setTranscript(text)
      
      const numbersMap: Record<string, string> = {
        'ek': '1', 'don': '2', 'teen': '3', 'char': '4', 'pach': '5', 'paach': '5',
        'saha': '6', 'saat': '7', 'aath': '8', 'nau': '9', 'daha': '10'
      }
      
      let foundCustomerId = ''
      for (const c of customers) {
        if (text.includes(c.name.toLowerCase())) {
          foundCustomerId = c.id
          break
        }
      }

      let quantity = ''
      const words = text.split(' ')
      for (const w of words) {
        if (!isNaN(parseFloat(w))) {
          quantity = w
          break
        }
        if (numbersMap[w]) {
          quantity = numbersMap[w]
          break
        }
      }

      if (foundCustomerId) setSelectedCustomer(foundCustomerId)
      if (quantity) setMorning(quantity) 
      
      setIsListening(false)
    }

    recognition.onerror = () => {
      setIsListening(false)
      alert("Microphone error. Please try again.")
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognition.start()
  }

  const totalLiters = entries.reduce((acc, curr) => acc + curr.morningQuantity + curr.eveningQuantity, 0)
  const totalAmount = entries.reduce((acc, curr) => acc + curr.totalAmount, 0)

  // Find selected customer object to auto-fill quantities
  const currentCustomer = customers.find(c => c.id === selectedCustomer)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{t(language, 'dailyMilkEntryTitle')}</h1>
          <p className="text-slate-500 text-sm mt-1">{t(language, 'dailyMilkEntryDesc')}</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3">
          <Button 
            onClick={handleAutoGenerate}
            disabled={isLoading}
            variant="outline"
            className="gap-2 rounded-xl bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100 shadow-sm"
          >
            <Zap className="w-4 h-4 fill-indigo-700" />
            {t(language, 'autoGenerate')}
          </Button>

          <div className="flex items-center gap-2 bg-white/60 p-2 rounded-2xl border border-slate-200">
            <CalendarIcon className="w-5 h-5 text-primary-500 ml-2" />
            <input 
              type="date" 
              value={date}
              onChange={e => setDate(e.target.value)}
              className="bg-transparent border-none focus:outline-none text-slate-700 font-medium cursor-pointer"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Entry Form */}
        <div className="lg:col-span-1 bg-white/60 backdrop-blur-md rounded-3xl border border-white/60 shadow-sm p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
              <Droplets className="text-primary-500 w-5 h-5" />
              {t(language, 'addEntry')}
            </h3>
            <Button 
              type="button"
              variant={isListening ? "default" : "outline"}
              onClick={startListening}
              className={`rounded-full px-4 gap-2 ${isListening ? 'bg-red-500 hover:bg-red-600 animate-pulse text-white border-red-500' : 'text-slate-600 border-slate-300'}`}
            >
              <Mic className="w-4 h-4" />
              {isListening ? t(language, 'listening') : t(language, 'voiceEntry')}
            </Button>
          </div>
          {transcript && <p className="text-sm text-slate-500 italic mb-4 text-center">" {transcript} "</p>}
          <form onSubmit={handleAddEntry} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t(language, 'selectCustomer')}</label>
              <select 
                required
                value={selectedCustomer}
                onChange={e => setSelectedCustomer(e.target.value)}
                className="w-full px-3 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
              >
                <option value="" disabled>-- Select Farmer/Customer --</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.milkType})</option>
                ))}
              </select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t(language, 'morningL')}</label>
                <input 
                  type="number" step="0.5" placeholder="0.0"
                  value={morning} onChange={e => setMorning(e.target.value)}
                  className="w-full px-3 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t(language, 'eveningL')}</label>
                <input 
                  type="number" step="0.5" placeholder="0.0"
                  value={evening} onChange={e => setEvening(e.target.value)}
                  className="w-full px-3 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t(language, 'fatOpt')}</label>
                <input 
                  type="number" step="0.1" placeholder="e.g. 4.5"
                  value={fat} onChange={e => setFat(e.target.value)}
                  className="w-full px-3 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t(language, 'snfOpt')}</label>
                <input 
                  type="number" step="0.1" placeholder="e.g. 8.5"
                  value={snf} onChange={e => setSnf(e.target.value)}
                  className="w-full px-3 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                />
              </div>
            </div>

            {currentCustomer && (
              <div className="bg-primary-50 p-4 rounded-xl text-sm mt-4">
                <div className="flex justify-between text-slate-600 mb-1">
                  <span>Rate per Liter:</span>
                  <span className="font-bold text-slate-800">₹{currentCustomer.ratePerLiter}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Total Amount:</span>
                  <span className="font-bold text-primary-700 text-lg">
                    ₹{((parseFloat(morning || '0') + parseFloat(evening || '0')) * currentCustomer.ratePerLiter).toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            <Button type="submit" size="lg" className="w-full rounded-xl text-md font-bold mt-2">
              {t(language, 'saveEntry')}
            </Button>
          </form>
        </div>

        {/* Entries Table */}
        <div className="lg:col-span-2 bg-white/60 backdrop-blur-md rounded-3xl border border-white/60 shadow-sm p-6 flex flex-col h-full">
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

          <div className="overflow-x-auto flex-1">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200/60 text-slate-500 text-sm">
                    <th className="pb-3 font-medium">{t(language, 'customer')}</th>
                    <th className="pb-3 font-medium text-center">{t(language, 'morning')}</th>
                    <th className="pb-3 font-medium text-center">{t(language, 'evening')}</th>
                    <th className="pb-3 font-medium text-right">{t(language, 'amountRs')}</th>
                    <th className="pb-3 font-medium text-right">WhatsApp</th>
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
                        <td className="py-4">
                          <span className="font-medium text-slate-800">{entry.customerName}</span>
                        </td>
                        <td className="py-4 text-center">
                          <span className={entry.morningQuantity > 0 ? "font-bold text-blue-600" : "text-slate-400"}>
                            {entry.morningQuantity > 0 ? `${entry.morningQuantity} L` : '-'}
                          </span>
                        </td>
                        <td className="py-4 text-center">
                          <span className={entry.eveningQuantity > 0 ? "font-bold text-indigo-600" : "text-slate-400"}>
                            {entry.eveningQuantity > 0 ? `${entry.eveningQuantity} L` : '-'}
                          </span>
                        </td>
                        <td className="py-4 text-right font-bold text-slate-700">
                          {entry.totalAmount}
                        </td>
                        <td className="py-4 text-right">
                          <div className="flex justify-end gap-1">
                            <Button 
                              variant="ghost" size="icon" 
                              title={t(language, 'deleteEntry')}
                              className="h-8 w-8 text-red-500 rounded-lg hover:bg-red-50"
                              onClick={() => handleDeleteEntry(entry.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" size="icon" 
                              title="WhatsApp Message"
                              className="h-8 w-8 text-green-600 rounded-lg hover:bg-green-50"
                              onClick={() => {
                                const totalQty = entry.morningQuantity + entry.eveningQuantity;
                                const text = `नमस्कार ${entry.customerName},%0A%0Aआजची तुमची दूध नोंद:%0Aसकाळ: ${entry.morningQuantity > 0 ? entry.morningQuantity + 'L' : '-'}%0Aसंध्याकाळ: ${entry.eveningQuantity > 0 ? entry.eveningQuantity + 'L' : '-'}%0Aएकूण: ${totalQty} L%0Aरक्कम: ₹${entry.totalAmount}%0A%0A- माखन डेअरी`;
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
        </div>
      </div>
    </div>
  )
}
