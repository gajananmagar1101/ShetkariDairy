import { useEffect, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Home, Users, Droplets, CreditCard, FileText, Settings, LogOut, CalendarDays, ChevronDown, BriefcaseBusiness, Sprout } from 'lucide-react'
import { useSettingsStore } from '../../store/settingsStore'
import { useAuthStore } from '../../store/useAuthStore'
import { t, translations } from '../../utils/translations'

type TranslationKey = keyof typeof translations['en']
type SidebarItem = {
  icon: typeof Home
  labelKey: TranslationKey
  path: string
}

const dairyNavItems: SidebarItem[] = [
  { icon: Home, labelKey: 'dashboard', path: '/' },
  { icon: Users, labelKey: 'customers', path: '/customers' },
  { icon: Droplets, labelKey: 'milkEntries', path: '/milk-entries' },
  { icon: FileText, labelKey: 'billing', path: '/billing' },
  { icon: CreditCard, labelKey: 'payments', path: '/payments' },
  { icon: FileText, labelKey: 'reports', path: '/reports' },
]

const labourNavItems: SidebarItem[] = [
  { icon: Users, labelKey: 'labourWorkers', path: '/labour/workers' },
  { icon: CalendarDays, labelKey: 'labourAttendance', path: '/labour/attendance' },
  { icon: CreditCard, labelKey: 'labourRecoveries', path: '/labour/recoveries' },
]

const utilityNavItems: SidebarItem[] = [
  { icon: Settings, labelKey: 'settings', path: '/settings' },
]

function SidebarLink({ item, onNavigate, language }: {
  item: SidebarItem
  onNavigate: () => void
  language: keyof typeof translations
}) {
  return (
    <NavLink
      to={item.path}
      onClick={onNavigate}
      className={({ isActive }) =>
        `flex items-center gap-3 px-4 py-3.5 rounded-[1.25rem] transition-all duration-300 relative ${
          isActive
            ? 'text-primary-700 dark:text-primary-300 font-semibold'
            : 'text-slate-500 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-800/50'
        }`
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <motion.div
              layoutId="sidebar-active"
              className="absolute inset-0 bg-white/60 dark:bg-slate-800/90 rounded-[1.25rem] shadow-[0_4px_12px_rgb(0,0,0,0.03)] border border-white/80 dark:border-slate-600 backdrop-blur-sm"
              initial={false}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            />
          )}
          <item.icon className="w-5 h-5 relative z-10" />
          <span className="relative z-10">{t(language, item.labelKey)}</span>
        </>
      )}
    </NavLink>
  )
}

function SidebarSection({
  title,
  icon: Icon,
  isExpanded,
  onToggle,
  items,
  onNavigate,
  language,
}: {
  title: string
  icon: typeof Home
  isExpanded: boolean
  onToggle: () => void
  items: SidebarItem[]
  onNavigate: () => void
  language: keyof typeof translations
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3 px-3">
        <span className="text-[0.7rem] font-bold uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">
          {title}
        </span>
        <div className="h-px flex-1 bg-gradient-to-r from-slate-200/90 via-slate-200/40 to-transparent dark:from-slate-700 dark:via-slate-800/40" />
      </div>

      <button
        type="button"
        onClick={onToggle}
        className={`flex w-full items-center justify-between rounded-[1.4rem] px-4 py-3.5 text-left transition-all ${
          isExpanded
            ? 'bg-white/75 text-primary-700 shadow-[0_4px_12px_rgb(0,0,0,0.03)] border border-white/80 dark:bg-slate-800/90 dark:border-slate-600 dark:text-primary-300'
            : 'text-slate-600 border border-transparent hover:bg-white/45 dark:text-slate-300 dark:hover:bg-slate-800/50'
        }`}
      >
        <span className="flex items-center gap-3 font-semibold">
          <span className={`flex h-10 w-10 items-center justify-center rounded-2xl ${
            isExpanded
              ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-200'
              : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300'
          }`}>
            <Icon className="h-5 w-5" />
          </span>
          <span>{title}</span>
        </span>
        <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
      </button>

      {isExpanded ? (
        <div className="ml-5 space-y-1 border-l border-dashed border-slate-200/90 pl-4 dark:border-slate-700">
          {items.map((item) => (
            <SidebarLink key={item.path} item={item} onNavigate={onNavigate} language={language} />
          ))}
        </div>
      ) : null}
    </div>
  )
}

export default function Sidebar() {
  const { language, setMobileMenuOpen } = useSettingsStore()
  const logout = useAuthStore(state => state.logout)
  const location = useLocation()
  const navigate = useNavigate()
  const [isDairyExpanded, setIsDairyExpanded] = useState(true)
  const [isLabourExpanded, setIsLabourExpanded] = useState(false)

  useEffect(() => {
    const path = location.pathname
    const isLabourRoute = path.startsWith('/labour')
    const isUtilityRoute = utilityNavItems.some((item) => item.path === path)
    const isDairyRoute = !isLabourRoute && !isUtilityRoute

    if (isDairyRoute) {
      setIsDairyExpanded(true)
    }

    if (isLabourRoute) {
      setIsLabourExpanded(true)
    }
  }, [location.pathname])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="h-full min-h-0 rounded-[2rem] bg-white/45 dark:bg-[#0b1120] backdrop-blur-[24px] flex flex-col py-8 shadow-[0_10px_40px_-10px_rgba(124,58,237,0.08)] dark:shadow-none border border-white/60 dark:border-slate-800 relative overflow-hidden">
      {/* Subtle sidebar inner glow */}
      <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-white/40 dark:from-white/5 to-transparent pointer-events-none" />
      <div className="relative z-10 flex min-h-0 flex-1 flex-col">
        <div className="px-6 mb-10 flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary-500 to-primary-400 flex items-center justify-center shadow-[0_8px_20px_rgb(139,92,246,0.3)]">
            <Sprout className="text-white w-6 h-6" />
          </div>
          <span className="font-extrabold text-2xl tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-slate-800 to-primary-900 dark:from-white dark:to-primary-200">
            {t(language, 'dairyName')}
          </span>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pr-3">
          <nav className="space-y-3 pb-4">
            <SidebarSection
              title={t(language, 'sidebarDairySection')}
              icon={Droplets}
              isExpanded={isDairyExpanded}
              onToggle={() => setIsDairyExpanded((current) => !current)}
              items={dairyNavItems}
              onNavigate={() => setMobileMenuOpen(false)}
              language={language}
            />

            <SidebarSection
              title={t(language, 'sidebarLabourSection')}
              icon={BriefcaseBusiness}
              isExpanded={isLabourExpanded}
              onToggle={() => setIsLabourExpanded((current) => !current)}
              items={labourNavItems}
              onNavigate={() => setMobileMenuOpen(false)}
              language={language}
            />

            <div className="space-y-1 pt-3">
              <div className="flex items-center gap-3 px-3">
                <span className="text-[0.7rem] font-bold uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">
                  {t(language, 'sidebarUtilitySection')}
                </span>
                <div className="h-px flex-1 bg-gradient-to-r from-slate-200/90 via-slate-200/40 to-transparent dark:from-slate-700 dark:via-slate-800/40" />
              </div>
              {utilityNavItems.map((item) => (
                <SidebarLink key={item.path} item={item} onNavigate={() => setMobileMenuOpen(false)} language={language} />
              ))}
            </div>
          </nav>
        </div>
      </div>

      <div className="px-6 pt-4 relative z-10 border-t border-white/50 dark:border-slate-800/80">
        <button 
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3.5 rounded-[1.25rem] w-full text-slate-500 dark:text-slate-300 hover:bg-red-50/50 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400 transition-colors font-medium"
        >
          <LogOut className="w-5 h-5" />
          <span>{t(language, 'logout')}</span>
        </button>
      </div>
    </div>
  )
}
