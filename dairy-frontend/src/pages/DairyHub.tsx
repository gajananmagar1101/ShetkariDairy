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
    <div className="mx-auto max-w-3xl space-y-5">
      <section className="rounded-[2rem] border border-white/80 bg-white/80 p-5 shadow-[0_18px_40px_-32px_rgba(15,23,42,0.22)] backdrop-blur-xl">
        <div className="mb-5">
          <h1 className="text-2xl font-black tracking-tight text-slate-900">
            {language === 'mr' ? 'डेअरी' : 'Dairy'}
          </h1>
          <p className="mt-1 text-sm font-medium text-slate-500">
            {language === 'mr' ? 'सगळे डेअरी पर्याय एका जागी' : 'All dairy options in one place'}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-x-2 gap-y-6 sm:grid-cols-4">
        {dairyActions.map((action) => (
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
              {t(language, action.key)}
            </h2>
          </button>
        ))}
        </div>
      </section>
    </div>
  )
}
