import { NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Home, Users, Droplets, CreditCard, FileText, Settings, LogOut, Package } from 'lucide-react'
import { useSettingsStore } from '../../store/settingsStore'
import { t, translations } from '../../utils/translations'

const getNavItems = () => [
  { icon: Home, labelKey: 'dashboard', path: '/' },
  { icon: Users, labelKey: 'customers', path: '/customers' },
  { icon: Droplets, labelKey: 'milkEntries', path: '/milk-entries' },
  { icon: FileText, labelKey: 'billing', path: '/billing' },
  { icon: CreditCard, labelKey: 'payments', path: '/payments' },
  { icon: Package, labelKey: 'inventory', path: '/inventory' },
  { icon: FileText, labelKey: 'reports', path: '/reports' },
  { icon: Settings, labelKey: 'settings', path: '/settings' },
]

export default function Sidebar() {
  const { language, setMobileMenuOpen } = useSettingsStore()
  const navItems = getNavItems()

  return (
    <div className="h-full rounded-[2rem] glass dark:glass-dark flex flex-col justify-between py-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60 dark:border-white/10 relative overflow-hidden">
      {/* Subtle sidebar inner glow */}
      <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-white/40 to-transparent pointer-events-none" />
      <div className="relative z-10">
        <div className="px-6 mb-10 flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary-500 to-primary-400 flex items-center justify-center shadow-[0_8px_20px_rgb(139,92,246,0.3)]">
            <Droplets className="text-white w-6 h-6" />
          </div>
          <span className="font-extrabold text-2xl tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-slate-800 to-primary-900 dark:from-white dark:to-primary-200">
            {t(language, 'dairyName')}
          </span>
        </div>

        <nav className="px-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3.5 rounded-[1.25rem] transition-all duration-300 relative ${
                  isActive 
                    ? 'text-primary-700 dark:text-primary-400 font-semibold' 
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-800/50'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.div 
                      layoutId="sidebar-active"
                      className="absolute inset-0 bg-white/60 dark:bg-slate-800/80 rounded-[1.25rem] shadow-[0_4px_12px_rgb(0,0,0,0.03)] border border-white/80 dark:border-slate-700 backdrop-blur-sm"
                      initial={false}
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                  <item.icon className="w-5 h-5 relative z-10" />
                  <span className="relative z-10">{t(language, item.labelKey as keyof typeof translations['en'])}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="px-6 relative z-10">
        <button className="flex items-center gap-3 px-4 py-3.5 rounded-[1.25rem] w-full text-slate-500 dark:text-slate-400 hover:bg-red-50/50 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400 transition-colors font-medium">
          <LogOut className="w-5 h-5" />
          <span>{t(language, 'logout')}</span>
        </button>
      </div>
    </div>
  )
}
