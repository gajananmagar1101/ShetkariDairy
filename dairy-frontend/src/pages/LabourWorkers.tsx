import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/button'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { Dialog, DialogContent } from '../components/ui/dialog'
import { LoadingBlock } from '../components/ui/loading'
import { useSettingsStore } from '../store/settingsStore'
import { t } from '../utils/translations'
import { getDisplayLocale } from '../utils/numberFormat'

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
  dailyRate: number
  totalAbsentDays: number
  totalHalfDays: number
  totalDeduction: number
  totalRecovered: number
  pendingRecovery: number
}

interface LabourAttendanceHistoryItem {
  id: string
  workerId: string
  workerName: string
  date: string
  status: 'PRESENT' | 'ABSENT' | 'HALF_DAY'
  reason?: string | null
}

export default function LabourWorkers() {
  const { language } = useSettingsStore()
  const navigate = useNavigate()
  const [workers, setWorkers] = useState<LabourWorker[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDeleting, setIsDeleting] = useState(false)
  const [historyLoadingKey, setHistoryLoadingKey] = useState<string | null>(null)
  const [deleteWorkerId, setDeleteWorkerId] = useState<string | null>(null)
  const [historyDialog, setHistoryDialog] = useState<{ worker: LabourWorker; type: 'ABSENT' | 'HALF_DAY' } | null>(null)
  const [attendanceHistoryByWorker, setAttendanceHistoryByWorker] = useState<Record<string, LabourAttendanceHistoryItem[]>>({})

  const loadWorkers = async () => {
    try {
      const res = await axios.get('/api/labour/workers')
      if (res.data.success) {
        setWorkers(res.data.data)
      }
    } catch (error) {
      console.error(error)
      toast.error(t(language, 'couldNotLoadData'))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadWorkers()
  }, [])

  const handleDelete = async () => {
    if (!deleteWorkerId || isDeleting) return
    setIsDeleting(true)
    try {
      await axios.delete(`/api/labour/workers/${deleteWorkerId}`)
      toast.success(t(language, 'workerDeleted'))
      setDeleteWorkerId(null)
      await loadWorkers()
    } catch (error: any) {
      console.error(error)
      toast.error(error?.message || t(language, 'failedDeleteWorker'))
    } finally {
      setIsDeleting(false)
    }
  }

  const toggleAttendanceHistory = async (workerId: string, type: 'ABSENT' | 'HALF_DAY') => {
    const historyKey = `${workerId}-${type}`
    const selectedWorker = workers.find((worker) => worker.id === workerId)
    if (!selectedWorker) return

    if (!attendanceHistoryByWorker[workerId]) {
      setHistoryLoadingKey(historyKey)
      try {
        const res = await axios.get('/api/labour/attendance/history', { params: { workerId } })
        if (res.data.success) {
          setAttendanceHistoryByWorker((current) => ({
            ...current,
            [workerId]: res.data.data,
          }))
        }
      } catch (error: any) {
        console.error(error)
        toast.error(error?.message || t(language, 'failedLoadAttendanceHistory'))
        setHistoryLoadingKey(null)
        return
      } finally {
        setHistoryLoadingKey(null)
      }
    }

    setHistoryDialog({ worker: selectedWorker, type })
  }

  const totalContractValue = useMemo(
    () => workers.reduce((sum, worker) => sum + (worker.contractAmount || 0), 0),
    [workers]
  )
  const totalPendingRecovery = useMemo(
    () => workers.reduce((sum, worker) => sum + (worker.pendingRecovery || 0), 0),
    [workers]
  )
  const totalRecovered = useMemo(
    () => workers.reduce((sum, worker) => sum + (worker.totalRecovered || 0), 0),
    [workers]
  )

  const getFilteredHistory = (workerId: string, type: 'ABSENT' | 'HALF_DAY') =>
    (attendanceHistoryByWorker[workerId] || []).filter((item) => item.status === type)

  const formatHistoryDate = (value: string) => {
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return value
    return new Intl.DateTimeFormat(getDisplayLocale(language), {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(parsed)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-800 dark:text-white">{t(language, 'labourWorkersTitle')}</h1>
          <p className="mt-1 font-medium text-slate-500 dark:text-slate-300">{t(language, 'labourWorkersDesc')}</p>
        </div>
        <Button type="button" onClick={() => navigate('/labour/workers/new')}>
          {t(language, 'addWorker')}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="rounded-3xl bg-white/60 dark:bg-slate-900/60 border border-white/60 dark:border-slate-700 p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{t(language, 'totalWorkers')}</p>
          <h3 className="mt-2 text-3xl font-bold text-slate-800 dark:text-white">{workers.length}</h3>
        </div>
        <div className="rounded-3xl bg-white/60 dark:bg-slate-900/60 border border-white/60 dark:border-slate-700 p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{t(language, 'totalContracts')}</p>
          <h3 className="mt-2 text-3xl font-bold text-slate-800 dark:text-white">₹{totalContractValue.toFixed(2)}</h3>
        </div>
        <div className="rounded-3xl bg-white/60 dark:bg-slate-900/60 border border-white/60 dark:border-slate-700 p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{t(language, 'totalPendingRecovery')}</p>
          <h3 className="mt-2 text-3xl font-bold text-amber-600 dark:text-amber-400">₹{totalPendingRecovery.toFixed(2)}</h3>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{t(language, 'totalRecoveredAmount')}: ₹{totalRecovered.toFixed(2)}</p>
        </div>
      </div>

      <div className="rounded-[2rem] bg-white/40 dark:bg-slate-900/60 border border-white/60 dark:border-slate-700/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-4 sm:p-6">
          {isLoading ? (
            <LoadingBlock label={t(language, 'loadingLabourWorkers')} minHeightClassName="min-h-[320px]" />
          ) : workers.length === 0 ? (
            <div className="flex min-h-[320px] items-center justify-center text-slate-500 dark:text-slate-300">
              {t(language, 'noWorkers')}
            </div>
          ) : (
            <div className="space-y-4">
              {workers.map((worker) => (
                <div key={worker.id} className="rounded-3xl border border-slate-200/70 dark:border-slate-700 bg-white/70 dark:bg-slate-900/70 p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white">{worker.name}</h3>
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${worker.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'}`}>
                          {worker.active ? t(language, 'active') : t(language, 'inactive')}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
                        {[worker.workType, worker.phone].filter(Boolean).join(' • ')}
                      </p>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{worker.contractStartDate} - {worker.contractEndDate}</p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <Button variant="outline" onClick={() => navigate(`/labour/workers/${worker.id}/edit`)} disabled={isDeleting}>
                        {t(language, 'edit')}
                      </Button>
                      <Button variant="destructive" onClick={() => setDeleteWorkerId(worker.id)} disabled={isDeleting}>
                        {isDeleting && deleteWorkerId === worker.id ? t(language, 'loadingShort') : t(language, 'delete')}
                      </Button>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-5">
                    <div>
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{t(language, 'contractAmount')}</p>
                      <p className="mt-1 font-bold text-slate-800 dark:text-white">₹{worker.contractAmount.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{t(language, 'dailyRate')}</p>
                      <p className="mt-1 font-bold text-slate-800 dark:text-white">₹{worker.dailyRate.toFixed(2)}</p>
                    </div>
                    <button
                      type="button"
                      className="text-left"
                      onClick={() => void toggleAttendanceHistory(worker.id, 'ABSENT')}
                      disabled={historyLoadingKey === `${worker.id}-ABSENT`}
                    >
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{t(language, 'absentDays')}</p>
                      <p className="mt-1 font-bold text-red-500">
                        {historyLoadingKey === `${worker.id}-ABSENT` ? t(language, 'loadingShort') : worker.totalAbsentDays}
                      </p>
                    </button>
                    <button
                      type="button"
                      className="text-left"
                      onClick={() => void toggleAttendanceHistory(worker.id, 'HALF_DAY')}
                      disabled={historyLoadingKey === `${worker.id}-HALF_DAY`}
                    >
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{t(language, 'halfDays')}</p>
                      <p className="mt-1 font-bold text-amber-500">
                        {historyLoadingKey === `${worker.id}-HALF_DAY` ? t(language, 'loadingShort') : worker.totalHalfDays}
                      </p>
                    </button>
                    <div>
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{t(language, 'pendingRecovery')}</p>
                      <p className="mt-1 font-bold text-emerald-600 dark:text-emerald-400">₹{worker.pendingRecovery.toFixed(2)}</p>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/70 p-4">
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{t(language, 'upfrontPaidAmount')}</p>
                      <p className="mt-1 font-semibold text-slate-800 dark:text-white">₹{worker.upfrontPaidAmount.toFixed(2)}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/70 p-4">
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{t(language, 'deduction')}</p>
                      <p className="mt-1 font-semibold text-red-500">₹{worker.totalDeduction.toFixed(2)}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/70 p-4">
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{t(language, 'recovered')}</p>
                      <p className="mt-1 font-semibold text-blue-600 dark:text-blue-400">₹{worker.totalRecovered.toFixed(2)}</p>
                    </div>
                  </div>

                  {worker.notes ? (
                    <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">{worker.notes}</p>
                  ) : null}
                </div>
              ))}
            </div>
          )}
      </div>

      <ConfirmDialog
        isOpen={deleteWorkerId !== null}
        onClose={() => {
          if (!isDeleting) {
            setDeleteWorkerId(null)
          }
        }}
        onConfirm={handleDelete}
        title={t(language, 'deleteWorkerTitle')}
        description={t(language, 'deleteWorkerDesc')}
        confirmText={t(language, 'delete')}
        cancelText={t(language, 'cancel')}
        isDestructive
        isProcessing={isDeleting}
      />

      <Dialog
        open={historyDialog !== null}
        onOpenChange={(open) => {
          if (!open) {
            setHistoryDialog(null)
          }
        }}
      >
        {historyDialog ? (
          <DialogContent className="max-w-5xl p-0 overflow-hidden">
            <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl">
              <div className="px-8 py-7 border-b border-slate-200/70 dark:border-slate-700/80">
                <div className="flex items-start gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-100 text-3xl font-bold text-primary-700 dark:bg-primary-900/40 dark:text-primary-200">
                    {historyDialog.worker.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                      {historyDialog.worker.name}
                    </h2>
                    <p className="mt-2 text-base text-slate-500 dark:text-slate-300">
                      {historyDialog.worker.phone || t(language, 'noPhone')} • {historyDialog.worker.active ? t(language, 'active') : t(language, 'inactive')}
                    </p>
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => setHistoryDialog((current) => current ? { ...current, type: 'ABSENT' } : current)}
                    className={`rounded-2xl border px-4 py-2 text-sm font-semibold transition-colors ${
                      historyDialog.type === 'ABSENT'
                        ? 'border-primary-500 bg-primary-50 text-primary-700 dark:border-primary-400 dark:bg-primary-900/30 dark:text-primary-200'
                        : 'border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    {t(language, 'absentDays')} ({getFilteredHistory(historyDialog.worker.id, 'ABSENT').length || historyDialog.worker.totalAbsentDays})
                  </button>
                  <button
                    type="button"
                    onClick={() => setHistoryDialog((current) => current ? { ...current, type: 'HALF_DAY' } : current)}
                    className={`rounded-2xl border px-4 py-2 text-sm font-semibold transition-colors ${
                      historyDialog.type === 'HALF_DAY'
                        ? 'border-primary-500 bg-primary-50 text-primary-700 dark:border-primary-400 dark:bg-primary-900/30 dark:text-primary-200'
                        : 'border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    {t(language, 'halfDays')} ({getFilteredHistory(historyDialog.worker.id, 'HALF_DAY').length || historyDialog.worker.totalHalfDays})
                  </button>
                </div>
              </div>

              <div className="px-8 py-7">
                <div className="rounded-[1.75rem] border border-slate-200/70 bg-slate-50/80 p-5 dark:border-slate-700 dark:bg-slate-950/40">
                  <div className="mb-4 text-sm font-semibold text-slate-500 dark:text-slate-400">
                    {historyDialog.type === 'ABSENT' ? t(language, 'absentDays') : t(language, 'halfDays')}
                  </div>

                  {historyLoadingKey === `${historyDialog.worker.id}-${historyDialog.type}` ? (
                    <LoadingBlock label={t(language, 'loadingShort')} minHeightClassName="min-h-[180px]" size="md" />
                  ) : getFilteredHistory(historyDialog.worker.id, historyDialog.type).length === 0 ? (
                    <div className="rounded-3xl border border-slate-200/70 bg-white/80 px-6 py-12 text-center text-slate-500 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300">
                      {t(language, 'noAttendanceNotes')}
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full border-separate border-spacing-0 overflow-hidden rounded-3xl border border-slate-200/70 bg-white/90 dark:border-slate-700 dark:bg-slate-900/70">
                        <thead>
                          <tr className="text-left text-sm text-slate-500 dark:text-slate-300">
                            <th className="px-6 py-4 font-semibold">{t(language, 'date')}</th>
                            <th className="px-6 py-4 font-semibold">{t(language, 'leaveReason')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {getFilteredHistory(historyDialog.worker.id, historyDialog.type).map((entry) => (
                            <tr key={entry.id} className="border-t border-slate-100 text-sm dark:border-slate-800">
                              <td className="px-6 py-4 font-medium text-slate-800 dark:text-slate-100">{formatHistoryDate(entry.date)}</td>
                              <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{entry.reason || t(language, 'noReasonAdded')}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </DialogContent>
        ) : null}
      </Dialog>
    </div>
  )
}
