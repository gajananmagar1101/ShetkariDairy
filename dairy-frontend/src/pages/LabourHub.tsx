import { useNavigate } from 'react-router-dom'
import { useSettingsStore } from '../store/settingsStore'
import { t } from '../utils/translations'
import {
  AddWorkerLauncherIcon,
  AttendanceLauncherIcon,
  RecoveriesLauncherIcon,
  WorkersLauncherIcon,
} from '../components/ui/launcher-icons'

const labourActions = [
  {
    key: 'labourWorkers',
    path: '/labour/workers',
    icon: WorkersLauncherIcon,
  },
  {
    key: 'addLabourWorker',
    path: '/labour/workers/new',
    icon: AddWorkerLauncherIcon,
  },
  {
    key: 'labourAttendance',
    path: '/labour/attendance',
    icon: AttendanceLauncherIcon,
  },
  {
    key: 'labourRecoveries',
    path: '/labour/recoveries',
    icon: RecoveriesLauncherIcon,
  },
] as const

export default function LabourHub() {
  const navigate = useNavigate()
  const { language } = useSettingsStore()

  return (
    <div className="mx-auto flex min-h-full max-w-3xl flex-col">
      <section className="flex-1 rounded-[2rem] border border-white/80 bg-white/80 p-5 shadow-[0_18px_40px_-32px_rgba(15,23,42,0.22)] backdrop-blur-xl">
        <div className="mb-5">
          <h1 className="text-2xl font-black tracking-tight text-slate-900">
            {language === 'mr' ? 'कामगार' : 'Labour'}
          </h1>
          <p className="mt-1 text-sm font-medium text-slate-500">
            {language === 'mr' ? 'सगळे कामगार पर्याय एका जागी' : 'All labour options in one place'}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-x-2 gap-y-6 sm:grid-cols-4">
        {labourActions.map((action) => (
          <button
            key={action.path}
            type="button"
            onClick={() => navigate(action.path)}
            className="group flex flex-col items-center text-center transition-all duration-300 hover:-translate-y-0.5"
          >
            <span className="transition-transform duration-300 group-hover:scale-110">
              <action.icon className="h-11 w-11" />
            </span>

            <h2 className="mt-2 text-[15px] font-bold tracking-tight text-slate-900 leading-tight">
              {action.key === 'addLabourWorker'
                ? (language === 'mr' ? 'नवीन कामगार' : 'New Worker')
                : t(language, action.key)}
            </h2>
          </button>
        ))}
        </div>
      </section>
    </div>
  )
}
