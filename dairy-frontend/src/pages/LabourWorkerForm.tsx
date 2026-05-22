import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'
import { Button } from '../components/ui/button'
import { LoadingBlock } from '../components/ui/loading'
import { useSettingsStore } from '../store/settingsStore'
import { t } from '../utils/translations'

interface LabourWorker {
  id: string
  name: string
  phone: string
  address: string
  workType: string
  joinDate: string
  contractStartDate: string
  contractEndDate: string
  contractAmount: number
  upfrontPaidAmount: number
  upfrontPaidDate: string
  active: boolean
  notes?: string
}

const today = new Date().toISOString().slice(0, 10)

export default function LabourWorkerForm() {
  const { language } = useSettingsStore()
  const navigate = useNavigate()
  const { workerId } = useParams()
  const isEditing = Boolean(workerId)
  const [isLoading, setIsLoading] = useState(isEditing)
  const [isSaving, setIsSaving] = useState(false)
  const [form, setForm] = useState({
    name: '',
    phone: '',
    address: '',
    workType: '',
    joinDate: today,
    contractStartDate: today,
    contractAmount: '150000',
    upfrontPaidAmount: '150000',
    upfrontPaidDate: today,
    active: true,
    notes: '',
  })

  useEffect(() => {
    if (!workerId) return

    const loadWorker = async () => {
      try {
        const res = await axios.get('/api/labour/workers')
        if (!res.data.success) return

        const worker = (res.data.data as LabourWorker[]).find((item) => item.id === workerId)
        if (!worker) {
          toast.error(t(language, 'couldNotLoadData'))
          navigate('/labour/workers')
          return
        }

        setForm({
          name: worker.name,
          phone: worker.phone,
          address: worker.address || '',
          workType: worker.workType || '',
          joinDate: worker.joinDate?.slice(0, 10) || today,
          contractStartDate: worker.contractStartDate?.slice(0, 10) || today,
          contractAmount: String(worker.contractAmount ?? 0),
          upfrontPaidAmount: String(worker.upfrontPaidAmount ?? 0),
          upfrontPaidDate: worker.upfrontPaidDate?.slice(0, 10) || today,
          active: worker.active,
          notes: worker.notes || '',
        })
      } catch (error) {
        console.error(error)
        toast.error(t(language, 'couldNotLoadData'))
        navigate('/labour/workers')
      } finally {
        setIsLoading(false)
      }
    }

    void loadWorker()
  }, [workerId, language, navigate])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (isSaving) return
    setIsSaving(true)

    const payload = {
      ...form,
      contractAmount: Number(form.contractAmount || 0),
      upfrontPaidAmount: Number(form.upfrontPaidAmount || 0),
    }

    try {
      if (workerId) {
        await axios.put(`/api/labour/workers/${workerId}`, payload)
      } else {
        await axios.post('/api/labour/workers', payload)
      }

      toast.success(t(language, 'workerSaved'))
      navigate('/labour/workers')
    } catch (error: any) {
      console.error(error)
      toast.error(error?.message || t(language, 'failedSaveWorker'))
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return <LoadingBlock label={t(language, 'loadingLabourWorkers')} minHeightClassName="min-h-[420px]" />
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-800 dark:text-white">
            {isEditing ? t(language, 'updateWorker') : t(language, 'addWorker')}
          </h1>
          <p className="mt-1 font-medium text-slate-500 dark:text-slate-300">{t(language, 'labourWorkersDesc')}</p>
        </div>

        <Button type="button" variant="outline" onClick={() => navigate('/labour/workers')} disabled={isSaving}>
          {t(language, 'cancel')}
        </Button>
      </div>

      <div className="rounded-[2rem] bg-white/40 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60 dark:border-slate-700/80 dark:bg-slate-900/60">
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <input className="rounded-2xl border border-slate-200/70 bg-white/70 px-4 py-3 dark:bg-slate-900/70 dark:border-slate-700 disabled:opacity-60" placeholder={t(language, 'name')} value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} disabled={isSaving} required />
            <input className="rounded-2xl border border-slate-200/70 bg-white/70 px-4 py-3 dark:bg-slate-900/70 dark:border-slate-700 disabled:opacity-60" placeholder={t(language, 'mobile')} value={form.phone} onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))} disabled={isSaving} required />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <input className="rounded-2xl border border-slate-200/70 bg-white/70 px-4 py-3 dark:bg-slate-900/70 dark:border-slate-700 disabled:opacity-60" placeholder={t(language, 'workerType')} value={form.workType} onChange={(e) => setForm((prev) => ({ ...prev, workType: e.target.value }))} disabled={isSaving} />
            <input className="rounded-2xl border border-slate-200/70 bg-white/70 px-4 py-3 dark:bg-slate-900/70 dark:border-slate-700 disabled:opacity-60" placeholder={t(language, 'address')} value={form.address} onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))} disabled={isSaving} />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <label className="text-sm text-slate-600 dark:text-slate-300">
              <span className="mb-2 block">{t(language, 'joinDate')}</span>
              <input type="date" className="w-full rounded-2xl border border-slate-200/70 bg-white/70 px-4 py-3 dark:bg-slate-900/70 dark:border-slate-700 disabled:opacity-60" value={form.joinDate} onChange={(e) => setForm((prev) => ({ ...prev, joinDate: e.target.value }))} disabled={isSaving} required />
            </label>
            <label className="text-sm text-slate-600 dark:text-slate-300">
              <span className="mb-2 block">{t(language, 'contractStartDate')}</span>
              <input type="date" className="w-full rounded-2xl border border-slate-200/70 bg-white/70 px-4 py-3 dark:bg-slate-900/70 dark:border-slate-700 disabled:opacity-60" value={form.contractStartDate} onChange={(e) => setForm((prev) => ({ ...prev, contractStartDate: e.target.value }))} disabled={isSaving} required />
            </label>
            <label className="text-sm text-slate-600 dark:text-slate-300">
              <span className="mb-2 block">{t(language, 'upfrontPaidDate')}</span>
              <input type="date" className="w-full rounded-2xl border border-slate-200/70 bg-white/70 px-4 py-3 dark:bg-slate-900/70 dark:border-slate-700 disabled:opacity-60" value={form.upfrontPaidDate} onChange={(e) => setForm((prev) => ({ ...prev, upfrontPaidDate: e.target.value }))} disabled={isSaving} required />
            </label>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="text-sm text-slate-600 dark:text-slate-300">
              <span className="mb-2 block">{t(language, 'contractAmount')}</span>
              <input type="number" min="0" className="w-full rounded-2xl border border-slate-200/70 bg-white/70 px-4 py-3 dark:bg-slate-900/70 dark:border-slate-700 disabled:opacity-60" value={form.contractAmount} onChange={(e) => setForm((prev) => ({ ...prev, contractAmount: e.target.value }))} disabled={isSaving} required />
            </label>
            <label className="text-sm text-slate-600 dark:text-slate-300">
              <span className="mb-2 block">{t(language, 'upfrontPaidAmount')}</span>
              <input type="number" min="0" className="w-full rounded-2xl border border-slate-200/70 bg-white/70 px-4 py-3 dark:bg-slate-900/70 dark:border-slate-700 disabled:opacity-60" value={form.upfrontPaidAmount} onChange={(e) => setForm((prev) => ({ ...prev, upfrontPaidAmount: e.target.value }))} disabled={isSaving} required />
            </label>
          </div>

          <textarea className="min-h-[96px] w-full rounded-2xl border border-slate-200/70 bg-white/70 px-4 py-3 dark:bg-slate-900/70 dark:border-slate-700 disabled:opacity-60" placeholder={t(language, 'notes')} value={form.notes} onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))} disabled={isSaving} />

          <label className="flex items-center gap-3 text-sm font-medium text-slate-600 dark:text-slate-300">
            <input type="checkbox" checked={form.active} onChange={(e) => setForm((prev) => ({ ...prev, active: e.target.checked }))} disabled={isSaving} />
            <span>{t(language, 'active')}</span>
          </label>

          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={isSaving}>
              {isSaving ? t(language, 'saveInProgress') : isEditing ? t(language, 'updateWorker') : t(language, 'saveWorker')}
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate('/labour/workers')} disabled={isSaving}>
              {t(language, 'cancel')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
