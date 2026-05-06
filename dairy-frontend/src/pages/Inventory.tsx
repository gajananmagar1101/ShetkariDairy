import { useState, useEffect } from 'react'
import { Package, IndianRupee } from 'lucide-react'
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

interface InventoryItem {
  id: string
  name: string
  category: string
  quantity: number
  unit: string
}

interface Expense {
  id: string
  category: string
  description: string
  amount: number
  date: string
}

export default function Inventory() {
  const { language } = useSettingsStore()
  const [items, setItems] = useState<InventoryItem[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])

  // Forms
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false)
  const [itemForm, setItemForm] = useState({ name: '', category: 'FEED', quantity: '', unit: 'KG' })

  const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false)
  const [expenseForm, setExpenseForm] = useState({ category: 'TRANSPORT', description: '', amount: '', date: new Date().toISOString().split('T')[0] })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [itemsRes, expRes] = await Promise.all([
        axios.get('/api/inventory/items'),
        axios.get('/api/inventory/expenses')
      ])
      if (itemsRes.data.success) setItems(itemsRes.data.data)
      if (expRes.data.success) setExpenses(expRes.data.data)
    } catch (err) {
      console.error(err)
    }
  }

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await axios.post('/api/inventory/items', { ...itemForm, quantity: parseFloat(itemForm.quantity) })
      if (res.data.success) {
        setItems([res.data.data, ...items])
        setIsItemDialogOpen(false)
        setItemForm({ name: '', category: 'FEED', quantity: '', unit: 'KG' })
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await axios.post('/api/inventory/expenses', { ...expenseForm, amount: parseFloat(expenseForm.amount) })
      if (res.data.success) {
        setExpenses([res.data.data, ...expenses])
        setIsExpenseDialogOpen(false)
        setExpenseForm({ ...expenseForm, description: '', amount: '' })
      }
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{t(language, 'inventoryTitle')}</h1>
          <p className="text-slate-500 text-sm mt-1">{t(language, 'inventoryDesc')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Inventory Section */}
        <div className="bg-white/60 backdrop-blur-md rounded-3xl border border-white/60 shadow-sm p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Package className="w-5 h-5 text-primary-500" />
              {t(language, 'stockItems')}
            </h2>
            <Dialog open={isItemDialogOpen} onOpenChange={setIsItemDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="rounded-xl">{t(language, 'addStock')}</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>{t(language, 'addInventoryItem')}</DialogTitle></DialogHeader>
                <form onSubmit={handleAddItem} className="space-y-4 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{t(language, 'itemName')}</label>
                    <input required type="text" value={itemForm.name} onChange={e => setItemForm({...itemForm, name: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-xl" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{t(language, 'category')}</label>
                    <select value={itemForm.category} onChange={e => setItemForm({...itemForm, category: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-xl">
                      <option value="FEED">Animal Feed</option>
                      <option value="MEDICINE">Medicine</option>
                      <option value="CANS">Cans / Equipment</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">{t(language, 'quantity')}</label>
                      <input required type="number" step="0.1" value={itemForm.quantity} onChange={e => setItemForm({...itemForm, quantity: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-xl" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">{t(language, 'unit')}</label>
                      <select value={itemForm.unit} onChange={e => setItemForm({...itemForm, unit: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-xl">
                        <option value="KG">KG</option>
                        <option value="PIECE">Piece</option>
                        <option value="LITER">Liter</option>
                      </select>
                    </div>
                  </div>
                  <Button type="submit" className="w-full rounded-xl mt-2">{t(language, 'saveItem')}</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-200/60 text-slate-500 text-sm">
                  <th className="pb-2 font-medium">{t(language, 'name')}</th>
                  <th className="pb-2 font-medium">{t(language, 'category')}</th>
                  <th className="pb-2 font-medium text-right">{t(language, 'stock')}</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {items.length === 0 ? (
                  <tr><td colSpan={3} className="py-4 text-center text-slate-500">{t(language, 'noItems')}</td></tr>
                ) : items.map(item => (
                  <tr key={item.id} className="border-b border-slate-100 last:border-0">
                    <td className="py-3 font-medium text-slate-800">{item.name}</td>
                    <td className="py-3"><span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs">{item.category}</span></td>
                    <td className="py-3 text-right font-bold text-primary-600">{item.quantity} {item.unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Expenses Section */}
        <div className="bg-white/60 backdrop-blur-md rounded-3xl border border-white/60 shadow-sm p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <IndianRupee className="w-5 h-5 text-red-500" />
              {t(language, 'expensesTitle')}
            </h2>
            <Dialog open={isExpenseDialogOpen} onOpenChange={setIsExpenseDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="destructive" className="rounded-xl bg-red-500 hover:bg-red-600">{t(language, 'addExpense')}</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>{t(language, 'recordExpense')}</DialogTitle></DialogHeader>
                <form onSubmit={handleAddExpense} className="space-y-4 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{t(language, 'category')}</label>
                    <select value={expenseForm.category} onChange={e => setExpenseForm({...expenseForm, category: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-xl">
                      <option value="TRANSPORT">Transport</option>
                      <option value="ELECTRICITY">Electricity</option>
                      <option value="FOOD">Food / Feed</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{t(language, 'description')}</label>
                    <input required type="text" value={expenseForm.description} onChange={e => setExpenseForm({...expenseForm, description: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-xl" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">{t(language, 'amount')} (₹)</label>
                      <input required type="number" value={expenseForm.amount} onChange={e => setExpenseForm({...expenseForm, amount: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-xl" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">{t(language, 'date')}</label>
                      <input required type="date" value={expenseForm.date} onChange={e => setExpenseForm({...expenseForm, date: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-xl" />
                    </div>
                  </div>
                  <Button type="submit" variant="destructive" className="w-full rounded-xl mt-2 bg-red-500">{t(language, 'saveExpense')}</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-200/60 text-slate-500 text-sm">
                  <th className="pb-2 font-medium">{t(language, 'date')}</th>
                  <th className="pb-2 font-medium">{t(language, 'desc')}</th>
                  <th className="pb-2 font-medium text-right">{t(language, 'amount')}</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {expenses.length === 0 ? (
                  <tr><td colSpan={3} className="py-4 text-center text-slate-500">{t(language, 'noExpenses')}</td></tr>
                ) : expenses.map(exp => (
                  <tr key={exp.id} className="border-b border-slate-100 last:border-0">
                    <td className="py-3 text-slate-600">{exp.date}</td>
                    <td className="py-3">
                      <p className="font-medium text-slate-800">{exp.description}</p>
                      <p className="text-xs text-slate-400">{exp.category}</p>
                    </td>
                    <td className="py-3 text-right font-bold text-red-500">₹{exp.amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  )
}
