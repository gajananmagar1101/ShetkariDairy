import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { Button } from '../components/ui/button'
import { LoadingBlock } from '../components/ui/loading'
import { useSettingsStore } from '../store/settingsStore'
import { t } from '../utils/translations'

interface LabourWorkerOption {
  id: string
  name: string
  pendingRecovery: number
  totalDeduction: number
  totalRecovered: number
  active: boolean
}

interface LabourRecovery {
  id: string
  workerId: string
  workerName: string
  recoveryDate: string
  amount: number
  paymentMethod?: string
  notes?: string
}

const today = new Date().toISOString().slice(0, 10)

export default function LabourRecoveries() {
  const { language } = useSettingsStore()
  const [workers, setWorkers] = useState<LabourWorkerOption[]>([])
  const [recoveries, setRecoveries] = useState<LabourRecovery[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [form, setForm] = useState({
    workerId: '',
    recoveryDate: today,
    amount: '',
    paymentMethod: 'CASH',
    notes: '',
  })

  const loadData = async () => {
    try {
      const [workersRes, recoveriesRes] = await Promise.all([
        axios.get('/api/labour/workers'),
        axios.get('/api/labour/recoveries'),
      ])

      if (workersRes.data.success) {
        setWorkers(workersRes.data.data.filter((worker: LabourWorkerOption) => worker.active !== false))
      }
      if (recoveriesRes.data.success) {
        setRecoveries(recoveriesRes.data.data)
      }
    } catch (error) {
      console.error(error)
      toast.error(t(language, 'couldNotLoadData'))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault()
    if (isSaving) return
    setIsSaving(true)
    try {
      await axios.post('/api/labour/recoveries', {
        ...form,
        amount: Number(form.amount || 0),
      })
      toast.success(t(language, 'recoverySaved'))
      setForm({
        workerId: '',
        recoveryDate: today,
        amount: '',
        paymentMethod: 'CASH',
        notes: '',
      })
      await loadData()
    } catch (error: any) {
      console.error(error)
      toast.error(error?.message || t(language, 'failedSaveRecovery'))
    } finally {
      setIsSaving(false)
    }
  }

  const totals = useMemo(() => {
    return workers.reduce(
      (acc, worker) => {
        acc.deduction += worker.totalDeduction || 0
        acc.recovered += worker.totalRecovered || 0
        acc.pending += worker.pendingRecovery || 0
        return acc
      },
      { deduction: 0, recovered: 0, pending: 0 }
    )
  }, [workers])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-800 dark:text-white">{t(language, 'labourRecoveriesTitle')}</h1>
        <p className="text-slate-500 dark:text-slate-300 font-medium mt-1">{t(language, 'labourRecoveriesDesc')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="rounded-3xl bg-white/60 dark:bg-slate-900/60 border border-white/60 dark:border-slate-700 p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{t(language, 'totalDeductionAmount')}</p>
          <h3 className="mt-2 text-3xl font-bold text-red-500">₹{totals.deduction.toFixed(2)}</h3>
        </div>
        <div className="rounded-3xl bg-white/60 dark:bg-slate-900/60 border border-white/60 dark:border-slate-700 p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{t(language, 'totalRecoveredAmount')}</p>
          <h3 className="mt-2 text-3xl font-bold text-blue-600 dark:text-blue-400">₹{totals.recovered.toFixed(2)}</h3>
        </div>
        <div className="rounded-3xl bg-white/60 dark:bg-slate-900/60 border border-white/60 dark:border-slate-700 p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{t(language, 'totalPendingRecovery')}</p>
          <h3 className="mt-2 text-3xl font-bold text-amber-600 dark:text-amber-400">₹{totals.pending.toFixed(2)}</h3>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[0.9fr,1.4fr] gap-6">
        <div className="rounded-[2rem] bg-white/40 dark:bg-slate-900/60 border border-white/60 dark:border-slate-700/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6">
          <h2 className="mb-4 text-xl font-bold text-slate-800 dark:text-white">{t(language, 'recordRecovery')}</h2>
          <form className="space-y-4" onSubmit={handleSave}>
            <select className="w-full rounded-2xl border border-slate-200/70 bg-white/70 px-4 py-3 dark:bg-slate-900/70 dark:border-slate-700 disabled:opacity-60" value={form.workerId} onChange={(e) => setForm((prev) => ({ ...prev, workerId: e.target.value }))} disabled={isSaving} required>
              <option value="">{t(language, 'selectWorker')}</option>
              {workers.map((worker) => (
                <option key={worker.id} value={worker.id}>
                  {worker.name} - ₹{worker.pendingRecovery.toFixed(2)}
                </option>
              ))}
            </select>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="text-sm text-slate-600 dark:text-slate-300">
                <span className="mb-2 block">{t(language, 'date')}</span>
                <input type="date" className="w-full rounded-2xl border border-slate-200/70 bg-white/70 px-4 py-3 dark:bg-slate-900/70 dark:border-slate-700 disabled:opacity-60" value={form.recoveryDate} onChange={(e) => setForm((prev) => ({ ...prev, recoveryDate: e.target.value }))} disabled={isSaving} required />
              </label>
              <label className="text-sm text-slate-600 dark:text-slate-300">
                <span className="mb-2 block">{t(language, 'recoveryAmount')}</span>
                <input type="number" min="0" step="0.01" className="w-full rounded-2xl border border-slate-200/70 bg-white/70 px-4 py-3 dark:bg-slate-900/70 dark:border-slate-700 disabled:opacity-60" value={form.amount} onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))} disabled={isSaving} required />
              </label>
            </div>

            <input className="w-full rounded-2xl border border-slate-200/70 bg-white/70 px-4 py-3 dark:bg-slate-900/70 dark:border-slate-700 disabled:opacity-60" placeholder={t(language, 'paymentMethod')} value={form.paymentMethod} onChange={(e) => setForm((prev) => ({ ...prev, paymentMethod: e.target.value }))} disabled={isSaving} />
            <textarea className="min-h-[96px] w-full rounded-2xl border border-slate-200/70 bg-white/70 px-4 py-3 dark:bg-slate-900/70 dark:border-slate-700 disabled:opacity-60" placeholder={t(language, 'notes')} value={form.notes} onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))} disabled={isSaving} />

            <Button type="submit" disabled={isSaving}>
              {isSaving ? t(language, 'saveInProgress') : t(language, 'saveRecovery')}
            </Button>
          </form>
        </div>

        <div className="rounded-[2rem] bg-white/40 dark:bg-slate-900/60 border border-white/60 dark:border-slate-700/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-4 sm:p-6">
          {isLoading ? (
            <LoadingBlock label={t(language, 'loadingLabourRecoveries')} minHeightClassName="min-h-[320px]" />
          ) : recoveries.length === 0 ? (
            <div className="flex min-h-[320px] items-center justify-center text-slate-500 dark:text-slate-300">
              {t(language, 'noRecoveries')}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200/60 dark:border-slate-600 text-slate-500 dark:text-slate-300 text-sm">
                    <th className="pb-3 px-4 font-medium whitespace-nowrap">{t(language, 'name')}</th>
                    <th className="pb-3 px-4 font-medium whitespace-nowrap">{t(language, 'date')}</th>
                    <th className="pb-3 px-4 font-medium whitespace-nowrap">{t(language, 'paymentMethod')}</th>
                    <th className="pb-3 px-4 font-medium text-right whitespace-nowrap">{t(language, 'recoveryAmount')}</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {recoveries.map((recovery) => (
                    <tr key={recovery.id} className="border-b border-slate-100 dark:border-slate-800/50 last:border-0">
                      <td className="py-4 px-4 whitespace-nowrap">
                        <span className="font-medium text-slate-800 dark:text-slate-200">{recovery.workerName}</span>
                        {recovery.notes ? (
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{recovery.notes}</p>
                        ) : null}
                      </td>
                      <td className="py-4 px-4 text-slate-600 dark:text-slate-300 whitespace-nowrap">{recovery.recoveryDate}</td>
                      <td className="py-4 px-4 text-slate-600 dark:text-slate-300 whitespace-nowrap">{recovery.paymentMethod || '-'}</td>
                      <td className="py-4 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">₹{recovery.amount.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
