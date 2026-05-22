import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { Mic, MicOff } from 'lucide-react'
import { LoadingBlock } from '../components/ui/loading'
import { useSettingsStore } from '../store/settingsStore'
import { t } from '../utils/translations'

type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'HALF_DAY' | null

interface LabourAttendanceItem {
  id: string | null
  workerId: string
  workerName: string
  date: string
  status: AttendanceStatus
  reason?: string | null
}

const today = new Date().toISOString().slice(0, 10)

export default function LabourAttendance() {
  const { language } = useSettingsStore()
  const [selectedDate, setSelectedDate] = useState(today)
  const [attendance, setAttendance] = useState<LabourAttendanceItem[]>([])
  const [reasonDrafts, setReasonDrafts] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [savingWorkerId, setSavingWorkerId] = useState<string | null>(null)
  const [listeningWorkerId, setListeningWorkerId] = useState<string | null>(null)

  const loadAttendance = async (date = selectedDate, showLoader = true) => {
    if (showLoader) {
      setIsLoading(true)
    }

    try {
      const res = await axios.get('/api/labour/attendance', { params: { date } })
      if (res.data.success) {
        setAttendance(res.data.data)
        setReasonDrafts(
          (res.data.data as LabourAttendanceItem[]).reduce<Record<string, string>>((acc, item) => {
            acc[item.workerId] = item.reason || ''
            return acc
          }, {})
        )
      }
    } catch (error) {
      console.error(error)
      toast.error(t(language, 'couldNotLoadData'))
    } finally {
      if (showLoader) {
        setIsLoading(false)
      }
    }
  }

  useEffect(() => {
    void loadAttendance(selectedDate)
  }, [selectedDate])

  const startVoiceTypingForWorker = (workerId: string) => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      toast.error(language === 'mr' ? 'Tumchya browser la voice typing cha support nahi.' : 'Your browser does not support voice typing.')
      return
    }

    const recognition = new SpeechRecognition()
    recognition.lang = language === 'mr' ? 'mr-IN' : 'en-US'
    recognition.interimResults = false
    recognition.maxAlternatives = 1

    recognition.onstart = () => {
      setListeningWorkerId(workerId)
    }

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript
      const cleaned = transcript.replace(/\.$/, '')
      setReasonDrafts((current) => ({
        ...current,
        [workerId]: current[workerId] ? `${current[workerId]} ${cleaned}`.trim() : cleaned,
      }))
    }

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error', event.error)
      setListeningWorkerId(null)
      if (event.error !== 'no-speech') {
        toast.error(language === 'mr' ? 'Aawaz olakhata ala nahi. Punha prayatna kara.' : 'Voice not recognized. Try again.')
      }
    }

    recognition.onend = () => {
      setListeningWorkerId(null)
    }

    recognition.start()
  }

  const markAttendance = async (workerId: string, status: Exclude<AttendanceStatus, null>) => {
    if (savingWorkerId === workerId) return
    const previousAttendance = attendance
    const nextReason = status === 'PRESENT' ? '' : (reasonDrafts[workerId] || '').trim()
    setAttendance((current) =>
      current.map((item) => (
        item.workerId === workerId
          ? { ...item, status, reason: nextReason }
          : item
      ))
    )
    if (status === 'PRESENT') {
      setReasonDrafts((current) => ({ ...current, [workerId]: '' }))
    }
    setSavingWorkerId(workerId)
    try {
      await axios.post('/api/labour/attendance', {
        workerId,
        date: selectedDate,
        status,
        reason: nextReason,
      })
      toast.success(t(language, 'attendanceSaved'))
    } catch (error: any) {
      console.error(error)
      setAttendance(previousAttendance)
      toast.error(error?.message || t(language, 'failedSaveAttendance'))
    } finally {
      setSavingWorkerId(null)
    }
  }

  const summary = useMemo(() => {
    return attendance.reduce(
      (acc, item) => {
        if (item.status === 'PRESENT') acc.present += 1
        if (item.status === 'ABSENT') acc.absent += 1
        if (item.status === 'HALF_DAY') acc.halfDay += 1
        if (!item.status) acc.unmarked += 1
        return acc
      },
      { present: 0, absent: 0, halfDay: 0, unmarked: 0 }
    )
  }, [attendance])

  const statusButtonClass = (isActive: boolean, tone: 'green' | 'red' | 'amber') => {
    const tones = {
      green: isActive ? 'bg-emerald-500 text-white border-emerald-500' : 'border-emerald-200 text-emerald-700 bg-emerald-50',
      red: isActive ? 'bg-red-500 text-white border-red-500' : 'border-red-200 text-red-700 bg-red-50',
      amber: isActive ? 'bg-amber-500 text-white border-amber-500' : 'border-amber-200 text-amber-700 bg-amber-50',
    }

    return `rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${tones[tone]}`
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-800 dark:text-white">{t(language, 'labourAttendanceTitle')}</h1>
          <p className="text-slate-500 dark:text-slate-300 font-medium mt-1">{t(language, 'labourAttendanceDesc')}</p>
        </div>

        <label className="text-sm text-slate-600 dark:text-slate-300">
          <span className="mb-2 block">{t(language, 'attendanceForDate')}</span>
          <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="rounded-2xl border border-slate-200/70 bg-white/70 px-4 py-3 dark:bg-slate-900/70 dark:border-slate-700" />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-3xl bg-white/60 dark:bg-slate-900/60 border border-white/60 dark:border-slate-700 p-5">
          <p className="text-sm text-slate-500 dark:text-slate-400">{t(language, 'present')}</p>
          <h3 className="mt-2 text-3xl font-bold text-emerald-600">{summary.present}</h3>
        </div>
        <div className="rounded-3xl bg-white/60 dark:bg-slate-900/60 border border-white/60 dark:border-slate-700 p-5">
          <p className="text-sm text-slate-500 dark:text-slate-400">{t(language, 'absent')}</p>
          <h3 className="mt-2 text-3xl font-bold text-red-500">{summary.absent}</h3>
        </div>
        <div className="rounded-3xl bg-white/60 dark:bg-slate-900/60 border border-white/60 dark:border-slate-700 p-5">
          <p className="text-sm text-slate-500 dark:text-slate-400">{t(language, 'halfDay')}</p>
          <h3 className="mt-2 text-3xl font-bold text-amber-500">{summary.halfDay}</h3>
        </div>
        <div className="rounded-3xl bg-white/60 dark:bg-slate-900/60 border border-white/60 dark:border-slate-700 p-5">
          <p className="text-sm text-slate-500 dark:text-slate-400">{t(language, 'status')}</p>
          <h3 className="mt-2 text-3xl font-bold text-slate-800 dark:text-white">{summary.unmarked}</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">{t(language, 'unmarkedAttendance')}</p>
        </div>
      </div>

      <div className="rounded-[2rem] bg-white/40 dark:bg-slate-900/60 border border-white/60 dark:border-slate-700/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-4 sm:p-6">
        {isLoading ? (
          <LoadingBlock label={t(language, 'loadingLabourAttendance')} minHeightClassName="min-h-[280px]" />
        ) : attendance.length === 0 ? (
          <div className="flex min-h-[280px] items-center justify-center text-slate-500 dark:text-slate-300">
            {t(language, 'noWorkers')}
          </div>
        ) : (
          <div className="space-y-4">
            {attendance.map((item) => (
              <div key={item.workerId} className="rounded-3xl border border-slate-200/70 dark:border-slate-700 bg-white/70 dark:bg-slate-900/70 p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white">{item.workerName}</h3>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
                      {item.status ? t(language, item.status === 'PRESENT' ? 'present' : item.status === 'ABSENT' ? 'absent' : 'halfDay') : t(language, 'unmarkedAttendance')}
                    </p>
                    {item.reason ? (
                      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                        {t(language, 'leaveReason')}: {item.reason}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button className={statusButtonClass(item.status === 'PRESENT', 'green')} onClick={() => void markAttendance(item.workerId, 'PRESENT')} disabled={savingWorkerId === item.workerId}>
                      {savingWorkerId === item.workerId ? t(language, 'loadingShort') : t(language, 'present')}
                    </button>
                    <button className={statusButtonClass(item.status === 'ABSENT', 'red')} onClick={() => void markAttendance(item.workerId, 'ABSENT')} disabled={savingWorkerId === item.workerId}>
                      {savingWorkerId === item.workerId ? t(language, 'loadingShort') : t(language, 'absent')}
                    </button>
                    <button className={statusButtonClass(item.status === 'HALF_DAY', 'amber')} onClick={() => void markAttendance(item.workerId, 'HALF_DAY')} disabled={savingWorkerId === item.workerId}>
                      {savingWorkerId === item.workerId ? t(language, 'loadingShort') : t(language, 'halfDay')}
                    </button>
                  </div>
                </div>

                {(item.status === 'ABSENT' || item.status === 'HALF_DAY') ? (
                  <div className="mt-4 space-y-3">
                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-300">
                      {t(language, 'leaveReasonOptional')}
                    </label>
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <div className="relative flex-1">
                        <input
                          className="w-full rounded-2xl border border-slate-200/70 bg-white/70 px-4 py-3 pr-14 dark:bg-slate-900/70 dark:border-slate-700 disabled:opacity-60"
                          placeholder={t(language, 'leaveReasonPlaceholder')}
                          value={reasonDrafts[item.workerId] || ''}
                          onChange={(e) => setReasonDrafts((current) => ({ ...current, [item.workerId]: e.target.value }))}
                          disabled={savingWorkerId === item.workerId}
                        />
                        <button
                          type="button"
                          onClick={() => startVoiceTypingForWorker(item.workerId)}
                          disabled={savingWorkerId === item.workerId}
                          className={`absolute right-2 top-1/2 -translate-y-1/2 rounded-xl p-2 transition-colors disabled:opacity-60 ${
                            listeningWorkerId === item.workerId
                              ? 'bg-rose-50 text-rose-500 animate-pulse'
                              : 'text-slate-400 hover:bg-slate-50 hover:text-primary-600'
                          }`}
                          title={t(language, 'voiceTyping')}
                        >
                          {listeningWorkerId === item.workerId ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
                        </button>
                      </div>
                      <button
                        type="button"
                        className="rounded-full border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                        onClick={() => {
                          if (item.status) {
                            void markAttendance(item.workerId, item.status)
                          }
                        }}
                        disabled={savingWorkerId === item.workerId}
                      >
                        {savingWorkerId === item.workerId ? t(language, 'loadingShort') : t(language, 'saveReason')}
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
