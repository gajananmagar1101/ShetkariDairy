import { useEffect, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Home,
  Users,
  Droplets,
  CreditCard,
  FileText,
  Settings,
  LogOut,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  BriefcaseBusiness,
} from 'lucide-react'
import { Logo } from '../ui/Logo'
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
  { icon: Home, labelKey: 'dashboard', path: '/dashboard' },
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

const utilityNavItems: SidebarItem[] = [{ icon: Settings, labelKey: 'settings', path: '/settings' }]

function SidebarLink({
  item,
  onNavigate,
  language,
  isCollapsed = false,
}: {
  item: SidebarItem
  onNavigate: () => void
  language: keyof typeof translations
  isCollapsed?: boolean
}) {
  return (
    <NavLink
      to={item.path}
      onClick={onNavigate}
      className={({ isActive }) =>
        `group flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} rounded-2xl px-3.5 py-3 transition-all duration-300 relative ${
          isActive
            ? 'text-[#4F46E5] font-semibold dark:text-white'
            : 'text-[#6B7280] hover:text-[#1A1A1A] dark:text-slate-400 dark:hover:text-white'
        }`
      }
      title={isCollapsed ? t(language, item.labelKey) : undefined}
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <motion.div
              layoutId="sidebar-active"
              className="absolute inset-0 rounded-2xl bg-[#F5F5F5] shadow-[0_2px_8px_rgba(0,0,0,0.02)] dark:bg-white/[0.05]"
              initial={false}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            />
          )}
          <item.icon className={`relative z-10 h-[18px] w-[18px] transition-colors duration-200 ${isActive ? 'text-[#4F46E5] dark:text-[#6366F1]' : ''}`} strokeWidth={isActive ? 2 : 1.7} />
          {!isCollapsed && <span className="relative z-10 text-[13.5px]">{t(language, item.labelKey)}</span>}
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
  isCollapsed = false,
}: {
  title: string
  icon: typeof Home
  isExpanded: boolean
  onToggle: () => void
  items: SidebarItem[]
  onNavigate: () => void
  language: keyof typeof translations
  isCollapsed?: boolean
}) {
  if (isCollapsed) {
    return (
      <div className="space-y-1">
        {items.map((item) => (
          <SidebarLink key={item.path} item={item} onNavigate={onNavigate} language={language} isCollapsed={true} />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-3 px-3 pt-1">
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#9CA3AF]">{title}</span>
        <div className="h-px flex-1 bg-[#E5E7EB]/60 dark:bg-white/[0.04]" />
      </div>

      <button
        type="button"
        onClick={onToggle}
        className={`flex w-full items-center justify-between rounded-2xl px-3.5 py-3 text-left transition-all duration-300 ${
          isExpanded
            ? 'bg-[#F5F5F5] text-[#1A1A1A] shadow-[0_2px_8px_rgba(0,0,0,0.02)] dark:bg-white/[0.04] dark:text-white'
            : 'text-[#6B7280] hover:bg-[#F9F9F9] dark:text-slate-400 dark:hover:bg-white/[0.03]'
        }`}
      >
        <span className="flex items-center gap-3 font-medium text-[13.5px]">
          <span
            className={`icon-box flex h-9 w-9 items-center justify-center rounded-[12px] transition-all duration-300 ${
              isExpanded
                ? 'bg-[#4F46E5]/10 text-[#4F46E5] dark:bg-[#6366F1]/15 dark:text-[#6366F1]'
                : 'bg-[#F5F5F5] text-[#6B7280] dark:bg-white/[0.05] dark:text-slate-400'
            }`}
          >
            <Icon className="h-[17px] w-[17px]" strokeWidth={1.7} />
          </span>
          <span>{title}</span>
        </span>
        <ChevronDown className={`h-3.5 w-3.5 text-[#9CA3AF] transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
      </button>

      <motion.div
        initial={false}
        animate={{ height: isExpanded ? 'auto' : 0, opacity: isExpanded ? 1 : 0 }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        className="overflow-hidden"
      >
        <div className="ml-4 space-y-0.5 border-l border-[#E5E7EB]/60 pl-3 dark:border-white/[0.04]">
          {items.map((item) => (
            <SidebarLink key={item.path} item={item} onNavigate={onNavigate} language={language} />
          ))}
        </div>
      </motion.div>
    </div>
  )
}

type AnimationStage = 'sidebar-content' | 'sidebar-position' | 'dashboard-expand' | 'complete' | null

export default function Sidebar({ animationStage = null }: { animationStage?: AnimationStage | string | null }) {
  const { language, setMobileMenuOpen } = useSettingsStore()
  const logout = useAuthStore((state) => state.logout)
  const location = useLocation()
  const navigate = useNavigate()
  const [isDairyExpanded, setIsDairyExpanded] = useState(true)
  const [isLabourExpanded, setIsLabourExpanded] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(() => localStorage.getItem('sidebar-collapsed') === 'true')

  const isAnimating = animationStage !== null
  const showContent = !isAnimating || animationStage === 'sidebar-content' || animationStage === 'sidebar-position' || animationStage === 'dashboard-expand' || animationStage === 'complete'

  const toggleCollapse = () => {
    const newState = !isCollapsed
    setIsCollapsed(newState)
    localStorage.setItem('sidebar-collapsed', String(newState))
  }

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
    <motion.div
      className="relative flex h-full min-h-0 flex-col overflow-hidden border-r border-[#E5E7EB]/60 bg-transparent py-7 transition-colors duration-500 dark:border-white/[0.04]"
      animate={{ width: isCollapsed ? 68 : 260 }}
      transition={{ type: 'spring', stiffness: 200, damping: 24 }}
    >
      {/* Collapse toggle */}
      {!isAnimating && (
        <button
          onClick={toggleCollapse}
          className="absolute right-3 top-3 z-20 flex h-7 w-7 items-center justify-center rounded-lg bg-[#F5F5F5] text-[#6B7280] transition-all duration-200 hover:bg-[#EBEBEB] hover:text-[#1A1A1A] dark:bg-white/[0.05] dark:text-slate-400 dark:hover:bg-white/[0.08] dark:hover:text-white"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
        </button>
      )}

      <div className="relative z-10 flex min-h-0 flex-1 flex-col">
        {/* Brand */}
        <motion.div
          className={`mb-8 flex items-center px-5 ${isCollapsed ? 'justify-center' : 'gap-3'}`}
          initial={isAnimating ? { opacity: 0, y: 10 } : false}
          animate={showContent ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        >
          <motion.div
            layoutId={isAnimating ? "brand-icon" : undefined}
            className="icon-box flex h-11 w-11 items-center justify-center overflow-hidden rounded-[14px]"
          >
            <Logo size={44} />
          </motion.div>
          {!isCollapsed && (
            <span className="text-xl font-bold tracking-tight text-[#1A1A1A] dark:text-white">
              {t(language, 'dairyName')}
            </span>
          )}
        </motion.div>

        {/* Navigation */}
        {showContent && (
          <motion.div
            className="min-h-0 flex-1 overflow-y-auto px-3"
            initial={isAnimating ? { opacity: 0 } : false}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, ease: 'easeOut', delay: 0.2 }}
          >
            <nav className="space-y-2 pb-4">
              <SidebarSection
                title={t(language, 'sidebarDairySection')}
                icon={Droplets}
                isExpanded={isDairyExpanded}
                onToggle={() => setIsDairyExpanded((current) => !current)}
                items={dairyNavItems}
                onNavigate={() => setMobileMenuOpen(false)}
                language={language}
                isCollapsed={isCollapsed}
              />

              <SidebarSection
                title={t(language, 'sidebarLabourSection')}
                icon={BriefcaseBusiness}
                isExpanded={isLabourExpanded}
                onToggle={() => setIsLabourExpanded((current) => !current)}
                items={labourNavItems}
                onNavigate={() => setMobileMenuOpen(false)}
                language={language}
                isCollapsed={isCollapsed}
              />

              {!isCollapsed && (
                <div className="space-y-0.5 pt-2">
                  <div className="flex items-center gap-3 px-3">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#9CA3AF]">
                      {t(language, 'sidebarUtilitySection')}
                    </span>
                    <div className="h-px flex-1 bg-[#E5E7EB]/60 dark:from-white/[0.04]" />
                  </div>
                  {utilityNavItems.map((item) => (
                    <SidebarLink key={item.path} item={item} onNavigate={() => setMobileMenuOpen(false)} language={language} />
                  ))}
                </div>
              )}
              {isCollapsed && (
                <div className="space-y-1 pt-2">
                  {utilityNavItems.map((item) => (
                    <SidebarLink key={item.path} item={item} onNavigate={() => setMobileMenuOpen(false)} language={language} isCollapsed={true} />
                  ))}
                </div>
              )}
            </nav>
          </motion.div>
        )}
      </div>

      {/* Logout */}
      {showContent && (
        <motion.div
          className="relative z-10 border-t border-[#E5E7EB]/60 px-4 pt-4 dark:border-white/[0.04]"
          initial={isAnimating ? { opacity: 0 } : false}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, ease: 'easeOut', delay: 0.4 }}
        >
          <button
            onClick={handleLogout}
            className={`flex w-full items-center ${isCollapsed ? 'justify-center' : 'gap-3'} rounded-2xl px-3.5 py-3 text-[13.5px] font-medium text-[#6B7280] transition-all duration-300 hover:bg-red-50 hover:text-red-600 dark:text-slate-400 dark:hover:bg-red-500/[0.08] dark:hover:text-red-400`}
            title={isCollapsed ? t(language, 'logout') : undefined}
          >
            <LogOut className="h-[18px] w-[18px]" strokeWidth={1.7} />
            {!isCollapsed && <span>{t(language, 'logout')}</span>}
          </button>
        </motion.div>
      )}
    </motion.div>
  )
}
