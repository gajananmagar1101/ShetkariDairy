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
  const { language } = useSettingsStore()
  const navItems = getNavItems()

  return (
    <div className="h-full rounded-3xl glass dark:glass-dark flex flex-col justify-between py-6 shadow-sm border border-white/40 dark:border-white/10">
      <div>
        <div className="px-6 mb-8 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary-500 to-primary-400 flex items-center justify-center shadow-lg shadow-primary-500/30">
            <Droplets className="text-white w-6 h-6" />
          </div>
          <span className="font-bold text-xl tracking-tight text-slate-800 dark:text-white">
            {t(language, 'dairyName')}
          </span>
        </div>

        <nav className="px-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-2xl transition-all relative ${
                  isActive 
                    ? 'text-primary-700 dark:text-primary-400 font-medium' 
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-800/50'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.div 
                      layoutId="sidebar-active"
                      className="absolute inset-0 bg-white/80 dark:bg-slate-800/80 rounded-2xl shadow-sm border border-white dark:border-slate-700"
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

      <div className="px-4">
        <button className="flex items-center gap-3 px-4 py-3 rounded-2xl w-full text-slate-500 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400 transition-colors">
          <LogOut className="w-5 h-5" />
          <span>{t(language, 'logout')}</span>
        </button>
      </div>
    </div>
  )
}
