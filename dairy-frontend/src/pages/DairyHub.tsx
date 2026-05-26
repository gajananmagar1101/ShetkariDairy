import { useNavigate } from 'react-router-dom'
import { useSettingsStore } from '../store/settingsStore'
import { t } from '../utils/translations'
import {
  BillingLauncherIcon,
  CustomersLauncherIcon,
  DashboardLauncherIcon,
  MilkLauncherIcon,
  PaymentsLauncherIcon,
  ReportsLauncherIcon,
} from '../components/ui/launcher-icons'

const dairyActions = [
  {
    key: 'dashboard',
    path: '/dashboard',
    icon: DashboardLauncherIcon,
  },
  {
    key: 'customers',
    path: '/customers',
    icon: CustomersLauncherIcon,
  },
  {
    key: 'milkEntries',
    path: '/milk-entries',
    icon: MilkLauncherIcon,
  },
  {
    key: 'billing',
    path: '/billing',
    icon: BillingLauncherIcon,
  },
  {
    key: 'payments',
    path: '/payments',
    icon: PaymentsLauncherIcon,
  },
  {
    key: 'reports',
    path: '/reports',
    icon: ReportsLauncherIcon,
  },
] as const

export default function DairyHub() {
  const navigate = useNavigate()
  const { language } = useSettingsStore()

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4">
      <div className="px-1">
        <h1 className="text-[1.9rem] font-black tracking-tight text-slate-900 dark:text-white">
          {language === 'mr' ? 'डेअरी' : 'Dairy'}
        </h1>
        <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-200">
          {language === 'mr' ? 'सगळे डेअरी पर्याय एका जागी' : 'All dairy options in one place'}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-x-3 gap-y-7 px-1 pt-2">
        {dairyActions.map((action) => (
          <button
            key={action.path}
            type="button"
            onClick={() => navigate(action.path)}
            className="group flex flex-col items-center rounded-[1.25rem] px-2 py-2 text-center transition-all duration-200 hover:bg-white/60 active:scale-[0.98] dark:hover:bg-white/5"
          >
            <span className="transition-transform duration-300 group-hover:scale-105">
              <action.icon className="h-11 w-11" />
            </span>

            <h2 className="mt-2 text-[14px] font-bold leading-tight tracking-tight text-slate-900 dark:text-white">
              {t(language, action.key)}
            </h2>
          </button>
        ))}
      </div>
    </div>
  )
}
