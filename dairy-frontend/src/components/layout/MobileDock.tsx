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
      className={`relative flex h-[4.55rem] min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-full px-2 text-[11px] font-semibold transition-all duration-300 ${
        active
          ? 'bg-emerald-200/95 text-emerald-900 shadow-[0_10px_24px_-16px_rgba(16,185,129,0.42)]'
          : 'bg-transparent text-slate-700'
      }`}
    >
      <Icon className={`h-6 w-6 transition-all duration-300 ${active ? 'scale-105' : ''}`} />
      <span className="leading-none">{label}</span>
    </button>
  )
}

export default function MobileDock() {
  const navigate = useNavigate()
  const location = useLocation()
  const { language } = useSettingsStore()
  const pathname = location.pathname

  const isHomeActive = pathname === '/'
  const isLabourActive = pathname.startsWith('/labour')
  const isDairyActive = pathname.startsWith('/dairy') || (!isHomeActive && !isLabourActive)

  return (
    <div className="md:hidden fixed inset-x-0 bottom-[calc(2rem+env(safe-area-inset-bottom))] z-40 px-5 pt-2 pointer-events-none">
      <div className="pointer-events-auto mx-auto max-w-[19.75rem] rounded-full border border-emerald-200/90 bg-emerald-50/92 px-2.5 py-2 shadow-[0_16px_34px_-22px_rgba(16,185,129,0.18),0_1px_0_rgba(255,255,255,0.9)_inset] backdrop-blur-xl">
        <div className="flex items-center justify-between gap-1.5">
          <DockTab
            active={isDairyActive}
            icon={Droplets}
            label={t(language, 'sidebarDairySection')}
            onClick={() => navigate('/dairy')}
          />

          <button
            type="button"
            onClick={() => navigate('/')}
            className={`relative flex h-[4.55rem] min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-full px-2 text-[11px] font-semibold transition-all duration-300 ${
              isHomeActive
                ? 'bg-emerald-200/95 text-emerald-900 shadow-[0_10px_24px_-16px_rgba(16,185,129,0.42)]'
                : 'bg-transparent text-slate-700'
            }`}
          >
            <Home className={`h-6 w-6 transition-all duration-300 ${isHomeActive ? 'scale-105' : ''}`} />
            <span className="leading-none">{language === 'mr' ? 'होम' : 'Home'}</span>
          </button>

          <DockTab
            active={isLabourActive}
            icon={BriefcaseBusiness}
            label={t(language, 'sidebarLabourSection')}
            onClick={() => navigate('/labour')}
          />
        </div>
      </div>
    </div>
  )
}
