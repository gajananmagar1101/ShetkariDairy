import type { ComponentType } from 'react'
import { BriefcaseBusiness, Droplets, Home } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useSettingsStore } from '../../store/settingsStore'
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
      className={`relative flex h-[3.2rem] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl px-1.5 text-[9px] font-semibold transition-all duration-300 ${
        active
          ? 'text-[#4F46E5] dark:text-white'
          : 'text-[#9CA3AF] dark:text-slate-400'
      }`}
    >
      {active && (
        <motion.div
          layoutId="dock-active"
          className="absolute inset-0 rounded-2xl bg-[#4F46E5]/8 dark:bg-white/[0.08]"
          transition={{ type: 'spring', stiffness: 350, damping: 30 }}
        />
      )}
      <Icon className={`relative z-10 h-[18px] w-[18px] transition-all duration-300 ${active ? 'scale-105' : ''}`} />
      <span className="relative z-10 leading-none">{label}</span>
    </button>
  )
}

export default function MobileDock() {
  const navigate = useNavigate()
  const location = useLocation()
  const { language, theme } = useSettingsStore()
  const pathname = location.pathname

  const isHomeActive = pathname === '/'
  const isLabourActive = pathname.startsWith('/labour')
  const isDairyActive = pathname.startsWith('/dairy') || (!isHomeActive && !isLabourActive)

  return (
    <div className="md:hidden fixed inset-x-0 bottom-[calc(1.75rem+env(safe-area-inset-bottom))] z-[70] px-6 pointer-events-none">
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.3 }}
        className={`pointer-events-auto mx-auto max-w-[17rem] rounded-2xl px-2 py-1.5 ring-1 ring-black/5 ${
          theme === 'dark'
            ? 'bg-[#1A1A1A] shadow-[0_20px_60px_rgba(0,0,0,0.5)]'
            : 'bg-white shadow-[0_20px_60px_rgba(0,0,0,0.08)]'
        }`}
      >
        <div className="flex items-center justify-between gap-1">
          <DockTab
            active={isDairyActive}
            icon={Droplets}
            label={t(language, 'sidebarDairySection')}
            onClick={() => navigate('/dairy')}
          />

          <DockTab
            active={isHomeActive}
            icon={Home}
            label={language === 'mr' ? 'होम' : 'Home'}
            onClick={() => navigate('/')}
          />

          <DockTab
            active={isLabourActive}
            icon={BriefcaseBusiness}
            label={t(language, 'sidebarLabourSection')}
            onClick={() => navigate('/labour')}
          />
        </div>
      </motion.div>
    </div>
  )
}
