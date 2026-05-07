import { Bell, Search, Menu, Moon, Sun } from 'lucide-react'
import { useSettingsStore } from '../../store/settingsStore'

export default function Header() {
  const { language, theme, toggleLanguage, toggleTheme, toggleMobileMenu } = useSettingsStore()

  return (
    <header className="h-16 flex items-center justify-between px-2">
      <div className="flex items-center gap-4">
        <button 
          onClick={toggleMobileMenu}
          className="md:hidden p-2 rounded-xl glass text-slate-600 dark:text-slate-300 active:scale-95 transition-transform"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="relative hidden md:block group">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-primary-500" />
          <input 
            type="text" 
            placeholder={language === 'mr' ? "काहीही शोधा..." : "Search anything..."} 
            className="pl-11 pr-5 py-2.5 bg-white/40 dark:bg-slate-800/40 border border-white/60 dark:border-slate-700 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 w-72 shadow-[0_2px_10px_rgb(0,0,0,0.02)] backdrop-blur-md transition-all focus:bg-white/80 dark:focus:bg-slate-800 dark:text-white"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button onClick={toggleLanguage} className="relative p-2.5 rounded-full glass hover:scale-105 active:scale-95 text-slate-600 dark:text-slate-300 hover:bg-white/80 transition-all font-bold text-sm w-10 h-10 flex items-center justify-center shadow-sm">
          {language === 'en' ? 'म' : 'EN'}
        </button>
        <button onClick={toggleTheme} className="relative p-2.5 rounded-full glass hover:scale-105 active:scale-95 text-slate-600 dark:text-slate-300 hover:bg-white/80 transition-all flex items-center justify-center shadow-sm">
          {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
        <button className="relative p-2.5 rounded-full glass hover:scale-105 active:scale-95 text-slate-600 dark:text-slate-300 hover:bg-white/80 transition-all flex items-center justify-center shadow-sm">
          <Bell className="w-5 h-5" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-white dark:border-slate-800 shadow-sm"></span>
        </button>
        
        <div className="flex items-center gap-3 pl-5 border-l border-slate-200/50 dark:border-slate-700">
          <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-slate-200 to-slate-50 dark:from-slate-700 dark:to-slate-800 border border-white shadow-sm flex items-center justify-center">
            <span className="font-bold text-slate-600 dark:text-slate-300 text-sm">GM</span>
          </div>
          <div className="hidden md:block">
            <p className="text-sm font-bold text-slate-800 dark:text-white">Gajanan Magar</p>
            <p className="text-xs font-medium text-slate-400 dark:text-slate-500">Admin</p>
          </div>
        </div>
      </div>
    </header>
  )
}
