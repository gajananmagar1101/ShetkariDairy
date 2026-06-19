import type { ComponentType } from 'react'
import { BriefcaseBusiness, Droplets, Home, Search, Settings } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useSettingsStore } from '../../store/settingsStore'
import { shouldHideMobileDock } from '../../lib/navigationVisibility'
import { t } from '../../utils/translations'

function DockTab({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean
  icon: ComponentType<{ className?: string }>
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex items-center justify-center gap-1.5 rounded-full px-3 py-2.5 transition-all duration-300 ${
        active ? 'text-[#1B5E20]' : 'text-white/70'
      }`}
      style={{ WebkitTapHighlightColor: 'transparent' }}
    >
      {active && (
        <motion.div
          layoutId="dock-active"
          className="absolute inset-0 rounded-full bg-[#C8E6C9]"
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        />
      )}
      <Icon className="relative z-10 h-[20px] w-[20px]" />
      {active && (
        <motion.span
          initial={{ opacity: 0, width: 0 }}
          animate={{ opacity: 1, width: 'auto' }}
          exit={{ opacity: 0, width: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className="relative z-10 overflow-hidden whitespace-nowrap text-[12px] font-bold leading-none text-[#1B5E20]"
        >
          {label}
        </motion.span>
      )}
    </button>
  )
}

export default function MobileDock() {
  const navigate = useNavigate()
  const location = useLocation()
  const { language } = useSettingsStore()
  const pathname = location.pathname

  if (shouldHideMobileDock(pathname)) {
    return null
  }

  const isHomeActive = pathname === '/'
  const isDairyActive = pathname.startsWith('/dairy') || pathname.startsWith('/customers') || pathname.startsWith('/milk-entries') || pathname.startsWith('/billing') || pathname.startsWith('/payments')
  const isLabourActive = pathname.startsWith('/labour')
  const isSearchActive = pathname === '/reports' || pathname === '/inventory'
  const isRecentActive = pathname === '/settings' || pathname === '/profile'
  const fallbackActive = !isHomeActive && !isDairyActive && !isLabourActive && !isSearchActive && !isRecentActive

  return (
    <div className="md:hidden fixed inset-x-0 bottom-[calc(1.5rem+env(safe-area-inset-bottom))] z-[70] flex justify-center pointer-events-none">
      <motion.nav
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.3 }}
        className="pointer-events-auto rounded-full bg-[#2E7D32] px-3 py-1.5 shadow-[0_8px_32px_rgba(27,94,32,0.45)]"
      >
        <div className="flex items-center gap-1">
          <DockTab
            active={isHomeActive || fallbackActive}
            icon={Home}
            label={language === 'mr' ? 'होम' : 'Home'}
            onClick={() => navigate('/')}
          />

          <DockTab
            active={isDairyActive}
            icon={Droplets}
            label={t(language, 'sidebarDairySection')}
            onClick={() => navigate('/dairy')}
          />

          <DockTab
            active={isLabourActive}
            icon={BriefcaseBusiness}
            label={t(language, 'sidebarLabourSection')}
            onClick={() => navigate('/labour')}
          />

          <DockTab
            active={isSearchActive}
            icon={Search}
            label={language === 'mr' ? 'शोधा' : 'Search'}
            onClick={() => navigate('/reports')}
          />

          <DockTab
            active={isRecentActive}
            icon={Settings}
            label={language === 'mr' ? 'सेटिंग्ज' : 'Settings'}
            onClick={() => navigate('/settings')}
          />
        </div>
      </motion.nav>
    </div>
  )
}
