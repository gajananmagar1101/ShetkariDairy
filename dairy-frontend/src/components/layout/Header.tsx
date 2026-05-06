import { Bell, Search, Menu, Moon, Sun } from 'lucide-react'
import { useSettingsStore } from '../../store/settingsStore'

export default function Header() {
  const { language, theme, toggleLanguage, toggleTheme } = useSettingsStore()

  return (
    <header className="h-16 flex items-center justify-between px-2">
      <div className="flex items-center gap-4">
        <button className="md:hidden p-2 rounded-xl glass text-slate-600 dark:text-slate-300">
          <Menu className="w-5 h-5" />
        </button>
        <div className="relative hidden md:block">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder={language === 'mr' ? "काहीही शोधा..." : "Search anything..."} 
            className="pl-10 pr-4 py-2 bg-white/60 dark:bg-slate-800/60 border border-white/80 dark:border-slate-700 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 w-64 shadow-sm backdrop-blur-md transition-all focus:bg-white dark:focus:bg-slate-800 dark:text-white"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button onClick={toggleLanguage} className="relative p-2 rounded-full glass text-slate-600 dark:text-slate-300 hover:bg-white/80 transition-colors font-bold text-sm w-9 h-9 flex items-center justify-center">
          {language === 'en' ? 'म' : 'EN'}
        </button>
        <button onClick={toggleTheme} className="relative p-2 rounded-full glass text-slate-600 dark:text-slate-300 hover:bg-white/80 transition-colors flex items-center justify-center">
          {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
        <button className="relative p-2 rounded-full glass text-slate-600 dark:text-slate-300 hover:bg-white/80 transition-colors flex items-center justify-center">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-[#f8fafc] dark:border-slate-900"></span>
        </button>
        
        <div className="flex items-center gap-3 pl-4 border-l border-slate-200/50 dark:border-slate-700">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-slate-200 to-slate-100 dark:from-slate-700 dark:to-slate-800 border border-white dark:border-slate-600 shadow-sm flex items-center justify-center">
            <span className="font-semibold text-slate-600 dark:text-slate-300 text-sm">GM</span>
          </div>
          <div className="hidden md:block">
            <p className="text-sm font-semibold text-slate-800 dark:text-white">Gajanan Magar</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Admin</p>
          </div>
        </div>
      </div>
    </header>
  )
}
