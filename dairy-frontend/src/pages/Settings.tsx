import { useEffect, useState } from 'react'
import { Clock3, Save, Wallet, AlertCircle, CheckCircle2 } from 'lucide-react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { fetchAppSettings, invalidateAppSettingsCache } from '../lib/userSettings'
import { useSettingsStore } from '../store/settingsStore'
import { t } from '../utils/translations'
import { LoadingInline } from '../components/ui/loading'

interface AutoEntrySettingsResponse {
  autoEntryTime: string
  labourAutoAttendanceTime: string
  timezone: string
  upiId: string
}

const UPI_PATTERN = /^[A-Za-z0-9._-]{2,}@[A-Za-z]{2,}$/

export default function Settings() {
  const { language } = useSettingsStore()
  
  const [savedAutoEntryTime, setSavedAutoEntryTime] = useState('21:30')
  const [autoEntryTime, setAutoEntryTime] = useState('21:30')
  const [savedLabourAutoAttendanceTime, setSavedLabourAutoAttendanceTime] = useState('20:00')
  const [labourAutoAttendanceTime, setLabourAutoAttendanceTime] = useState('20:00')
  const [timezone, setTimezone] = useState('Asia/Kolkata')
  
  const [savedUpiId, setSavedUpiId] = useState('')
  const [upiId, setUpiId] = useState('')
  const [isUpiValid, setIsUpiValid] = useState(true)
  
  const [isLoading, setIsLoading] = useState(true)
  const [isSavingTime, setIsSavingTime] = useState(false)
  const [isSavingUpi, setIsSavingUpi] = useState(false)

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const data = await fetchAppSettings()
        const fetchedTime = data.autoEntryTime || '21:30'
        const fetchedLabourTime = data.labourAutoAttendanceTime || '20:00'
        const fetchedUpi = data.upiId || ''
        
        setAutoEntryTime(fetchedTime)
        setSavedAutoEntryTime(fetchedTime)
        setLabourAutoAttendanceTime(fetchedLabourTime)
        setSavedLabourAutoAttendanceTime(fetchedLabourTime)
        setTimezone(data.timezone || 'Asia/Kolkata')
        
        setUpiId(fetchedUpi)
        setSavedUpiId(fetchedUpi)
      } catch (error) {
        console.error(error)
        toast.error(t(language, 'settingsLoadError'))
      } finally {
        setIsLoading(false)
      }
    }

    fetchSettings()
  }, [language])

  const handleUpiChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setUpiId(val)
    if (val === '') {
      setIsUpiValid(true) // allow clearing
    } else {
      setIsUpiValid(UPI_PATTERN.test(val))
    }
  }

  const handleSaveTime = async () => {
    setIsSavingTime(true)
    try {
      const res = await axios.put('/api/users/auto-entry-settings', { 
        autoEntryTime, 
        labourAutoAttendanceTime,
        upiId: savedUpiId // Send the saved UPI ID, not the uncommitted one
      })
      if (res.data.success) {
        const data = res.data.data as AutoEntrySettingsResponse
        invalidateAppSettingsCache()
        const updatedTime = data.autoEntryTime || autoEntryTime
        const updatedLabourTime = data.labourAutoAttendanceTime || labourAutoAttendanceTime
        setAutoEntryTime(updatedTime)
        setSavedAutoEntryTime(updatedTime)
        setLabourAutoAttendanceTime(updatedLabourTime)
        setSavedLabourAutoAttendanceTime(updatedLabourTime)
        
        // Sync UPI ID state just in case, but revert any uncommitted changes to UI
        const updatedUpi = data.upiId || savedUpiId
        setUpiId(updatedUpi)
        setSavedUpiId(updatedUpi)
        if (updatedUpi) setIsUpiValid(UPI_PATTERN.test(updatedUpi))
        
        toast.success(t(language, 'settingsSaved'))
      }
    } catch (error) {
      console.error(error)
      toast.error(t(language, 'settingsSaveError'))
    } finally {
      setIsSavingTime(false)
    }
  }

  const handleSaveUpiId = async () => {
    if (!isUpiValid) return
    setIsSavingUpi(true)
    try {
      const res = await axios.put('/api/users/auto-entry-settings', { 
        autoEntryTime: savedAutoEntryTime, // Send the saved time, not the uncommitted one
        labourAutoAttendanceTime: savedLabourAutoAttendanceTime,
        upiId 
      })
      if (res.data.success) {
        const data = res.data.data as AutoEntrySettingsResponse
        invalidateAppSettingsCache()
        const updatedUpi = data.upiId || upiId
        setUpiId(updatedUpi)
        setSavedUpiId(updatedUpi)
        if (updatedUpi) setIsUpiValid(UPI_PATTERN.test(updatedUpi))
        
        // Sync Time state just in case, but revert any uncommitted changes to UI
        const updatedTime = data.autoEntryTime || savedAutoEntryTime
        setAutoEntryTime(updatedTime)
        setSavedAutoEntryTime(updatedTime)
        const updatedLabourTime = data.labourAutoAttendanceTime || savedLabourAutoAttendanceTime
        setLabourAutoAttendanceTime(updatedLabourTime)
        setSavedLabourAutoAttendanceTime(updatedLabourTime)
        
        toast.success(t(language, 'settingsSaved'))
      }
    } catch (error) {
      console.error(error)
      toast.error(t(language, 'settingsSaveError'))
    } finally {
      setIsSavingUpi(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-8">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-800 dark:text-white">
          {t(language, 'settingsTitle')}
        </h1>
        <p className="mt-1 text-slate-500 dark:text-slate-300 font-medium">
          {t(language, 'settingsDesc')}
        </p>
      </div>

      <section className="overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white/95 shadow-xl dark:border-slate-800 dark:bg-slate-900/80 transition-all hover:shadow-2xl">
        <div className="relative overflow-hidden px-6 py-8 sm:px-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.14),_transparent_35%),radial-gradient(circle_at_bottom_right,_rgba(14,165,233,0.16),_transparent_40%)]" />
          <div className="relative flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/30">
              <Clock3 className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                {t(language, 'autoEntryTimeTitle')}
              </h2>
              <p className="max-w-2xl text-sm font-medium text-slate-600 dark:text-slate-300">
                {t(language, 'autoEntryTimeDesc')}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-6 px-6 pb-6 sm:px-8 sm:pb-8">
          <div className="rounded-3xl border border-slate-200 bg-slate-50/80 p-5 dark:border-slate-800 dark:bg-slate-950/40">
            <label className="mb-3 block text-sm font-semibold text-slate-700 dark:text-slate-200">
              {t(language, 'autoEntryTimeLabel')}
            </label>
            {isLoading ? (
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-300">
                <LoadingInline />
              </div>
            ) : (
              <input
                type="time"
                value={autoEntryTime}
                onChange={(e) => setAutoEntryTime(e.target.value)}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-lg font-semibold text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            )}
            <p className="mt-3 text-sm font-medium text-slate-500 dark:text-slate-400">
              {t(language, 'autoEntryTimezoneNote')} {timezone}
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-50/80 p-5 dark:border-slate-800 dark:bg-slate-950/40">
            <label className="mb-3 block text-sm font-semibold text-slate-700 dark:text-slate-200">
              {t(language, 'labourAutoAttendanceTimeLabel')}
            </label>
            {isLoading ? (
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-300">
                <LoadingInline />
              </div>
            ) : (
              <input
                type="time"
                value={labourAutoAttendanceTime}
                onChange={(e) => setLabourAutoAttendanceTime(e.target.value)}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-lg font-semibold text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            )}
            <p className="mt-3 text-sm font-medium text-slate-500 dark:text-slate-400">
              {t(language, 'labourAutoAttendanceTimeDesc')}
            </p>
          </div>

          <button
            type="button"
            onClick={handleSaveTime}
            disabled={isLoading || isSavingTime || (autoEntryTime === savedAutoEntryTime && labourAutoAttendanceTime === savedLabourAutoAttendanceTime)}
            className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-600/25 transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSavingTime ? <LoadingInline label="" className="gap-0" /> : <Save className="h-4 w-4" />}
            {t(language, 'saveSettings')}
          </button>
        </div>
      </section>

      <section className="overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white/95 shadow-xl dark:border-slate-800 dark:bg-slate-900/80 transition-all hover:shadow-2xl">
        <div className="relative overflow-hidden px-6 py-8 sm:px-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.14),_transparent_35%),radial-gradient(circle_at_bottom_right,_rgba(139,92,246,0.16),_transparent_40%)]" />
          <div className="relative flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500 text-white shadow-lg shadow-blue-500/30">
              <Wallet className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                {language === 'mr' ? 'यूपीआय सेटिंग्ज' : 'UPI Settings'}
              </h2>
              <p className="max-w-2xl text-sm font-medium text-slate-600 dark:text-slate-300">
                {language === 'mr' ? 'पेमेंट घेण्यासाठी तुमचा वैयक्तिक यूपीआय आयडी सेट करा' : 'Set your personal UPI ID for receiving payments'}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-6 px-6 pb-6 sm:px-8 sm:pb-8">
          <div className="rounded-3xl border border-slate-200 bg-slate-50/80 p-5 dark:border-slate-800 dark:bg-slate-950/40">
            <label className="mb-3 block text-sm font-semibold text-slate-700 dark:text-slate-200">
              {t(language, 'upiIdLabel')}
            </label>
            <div className="relative">
              <input
                type="text"
                value={upiId}
                onChange={handleUpiChange}
                placeholder={language === 'mr' ? 'तुमचेनाव@बँक' : 'yourname@bank'}
                className={`w-full rounded-2xl border bg-white px-4 py-3 text-base font-semibold text-slate-900 outline-none transition focus:ring-4 dark:bg-slate-900 dark:text-white ${
                  !isUpiValid && upiId !== ''
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500/10 dark:border-red-500'
                    : upiId !== '' && isUpiValid
                    ? 'border-green-500 focus:border-green-500 focus:ring-green-500/10 dark:border-green-500'
                    : 'border-slate-300 focus:border-blue-500 focus:ring-blue-500/10 dark:border-slate-700'
                }`}
              />
              {upiId !== '' && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  {!isUpiValid ? (
                    <AlertCircle className="h-5 w-5 text-red-500" />
                  ) : (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  )}
                </div>
              )}
            </div>
            {!isUpiValid && upiId !== '' && (
              <p className="mt-2 text-sm font-medium text-red-500">
                {language === 'mr' ? 'कृपया योग्य UPI ID टाका (उदा. name@bank)' : 'Please enter a valid UPI ID (e.g. name@bank)'}
              </p>
            )}
            <p className="mt-3 text-sm font-medium text-slate-500 dark:text-slate-400">
              {t(language, 'upiIdDesc')}
            </p>
          </div>

          <button
            type="button"
            onClick={handleSaveUpiId}
            disabled={isLoading || isSavingUpi || !isUpiValid || upiId === savedUpiId}
            className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSavingUpi ? <LoadingInline label="" className="gap-0" /> : <Save className="h-4 w-4" />}
            {t(language, 'saveSettings')}
          </button>
        </div>
      </section>
    </div>
  )
}
