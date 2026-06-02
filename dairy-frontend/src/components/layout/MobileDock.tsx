import type { ComponentType } from 'react'
import { BriefcaseBusiness, Droplets, Home } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useSettingsStore } from '../../store/settingsStore'
import { t } from '../../utils/translations'

function DockTab({
  active,
  icon: Icon,
  label,
  onClick,
  darkMode,
}: {
  active: boolean
  icon: ComponentType<{ className?: string }>
  label: string
  onClick: () => void
  darkMode: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex h-[3.55rem] min-w-0 flex-1 flex-col items-center justify-center gap-0 rounded-full px-1.5 text-[9px] font-semibold transition-all duration-300 ${
        active
          ? darkMode
            ? 'bg-white text-black shadow-[0_12px_24px_-18px_rgba(0,0,0,0.9)]'
            : 'bg-emerald-200/95 text-emerald-900 shadow-[0_10px_24px_-16px_rgba(16,185,129,0.42)]'
          : darkMode
            ? 'bg-transparent text-slate-200'
            : 'bg-transparent text-slate-700'
      }`}
    >
      <Icon className={`h-4.5 w-4.5 transition-all duration-300 ${active ? 'scale-105' : ''}`} />
      <span className="leading-none">{label}</span>
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
    <div className="md:hidden fixed inset-x-0 bottom-[calc(1.1rem+env(safe-area-inset-bottom))] z-40 px-5 pt-2 pointer-events-none">
      <div
        className={`pointer-events-auto mx-auto max-w-[18.8rem] rounded-full px-2 py-1 shadow-[0_10px_22px_rgba(15,23,42,0.12),0_1px_0_rgba(255,255,255,0.9)_inset] backdrop-blur-xl ${
          theme === 'dark'
            ? 'border border-white/10 bg-[#111111]/94 shadow-[0_18px_34px_rgba(0,0,0,0.42)]'
            : 'border border-emerald-200/90 bg-emerald-50/92'
        }`}
      >
        <div className="flex items-center justify-between gap-1.5">
          <DockTab
            active={isDairyActive}
            icon={Droplets}
            label={t(language, 'sidebarDairySection')}
            onClick={() => navigate('/dairy')}
            darkMode={theme === 'dark'}
          />

          <button
            type="button"
            onClick={() => navigate('/')}
            className={`relative flex h-[3.55rem] min-w-0 flex-1 flex-col items-center justify-center gap-0 rounded-full px-1.5 text-[9px] font-semibold transition-all duration-300 ${
              isHomeActive
                ? theme === 'dark'
                  ? 'bg-white text-black shadow-[0_12px_24px_-18px_rgba(0,0,0,0.9)]'
                  : 'bg-emerald-200/95 text-emerald-900 shadow-[0_10px_24px_-16px_rgba(16,185,129,0.42)]'
                : theme === 'dark'
                  ? 'bg-transparent text-slate-200'
                  : 'bg-transparent text-slate-700'
            }`}
          >
            <Home className={`h-4.5 w-4.5 transition-all duration-300 ${isHomeActive ? 'scale-105' : ''}`} />
            <span className="leading-none">{language === 'mr' ? 'होम' : 'Home'}</span>
          </button>

          <DockTab
            active={isLabourActive}
            icon={BriefcaseBusiness}
            label={t(language, 'sidebarLabourSection')}
            onClick={() => navigate('/labour')}
            darkMode={theme === 'dark'}
          />
        </div>
      </div>
    </div>
  )
}
