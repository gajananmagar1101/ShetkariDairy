import { useState, useRef, useEffect } from 'react'
import { Search, Moon, Sun, LogOut, Settings, User } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useSettingsStore } from '../../store/settingsStore'
import { useAuthStore } from '../../store/useAuthStore'

export default function Header() {
  const { language, theme, toggleLanguage, toggleTheme } = useSettingsStore()
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <header className="flex h-[4.75rem] items-center justify-between gap-2 px-4 min-w-0">
      <div className="flex items-center gap-2 sm:gap-4 min-w-0 self-center">
        <div className="min-w-0 pr-2">
          <h1
            className="truncate text-[1.25rem] font-black leading-none text-slate-900 dark:text-white"
            style={{ fontFamily: "'Nunito', 'Plus Jakarta Sans', sans-serif" }}
          >
            Shetkari Vahi
          </h1>
        </div>
        <div className="relative hidden md:block group">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-primary-500 dark:group-focus-within:text-white" />
          <input 
            type="text" 
            placeholder={language === 'mr' ? "काहीही शोधा..." : "Search anything..."} 
            className="pl-11 pr-5 py-2.5 bg-white/40 dark:bg-zinc-900 border border-white/60 dark:border-zinc-700 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 dark:focus:ring-white/30 w-72 shadow-[0_2px_10px_rgb(0,0,0,0.02)] backdrop-blur-md transition-all focus:bg-white/80 dark:focus:bg-black dark:text-white"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4 min-w-0 self-center">
        <button onClick={toggleLanguage} className="relative flex h-10 w-10 items-center justify-center rounded-full p-2.5 text-sm font-bold text-slate-600 shadow-sm transition-all hover:scale-105 hover:bg-white/80 active:scale-95 dark:border dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10">
          {language === 'en' ? 'म' : 'EN'}
        </button>
        <button onClick={toggleTheme} className="relative flex items-center justify-center rounded-full p-2.5 text-slate-600 shadow-sm transition-all hover:scale-105 hover:bg-white/80 active:scale-95 dark:border dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10">
          {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
        
        <div className="relative" ref={profileRef}>
          <div 
            className="flex items-center gap-2 sm:gap-3 pl-3 sm:pl-5 border-l border-slate-200/50 dark:border-slate-700 cursor-pointer min-w-0"
            onClick={() => setIsProfileOpen(!isProfileOpen)}
          >
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-gradient-to-tr from-slate-200 to-slate-50 dark:from-slate-700 dark:to-slate-800 border border-white shadow-sm flex items-center justify-center overflow-hidden flex-shrink-0">
              {user?.picture ? (
                <img src={user.picture} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <span className="font-bold text-slate-600 dark:text-slate-300 text-sm">
                  {user?.name ? user.name.substring(0, 2).toUpperCase() : 'GM'}
                </span>
              )}
            </div>
            <div className="hidden md:flex flex-col text-left">
              <p className="text-sm font-bold text-slate-800 dark:text-white">{user?.name || 'Gajanan Magar'}</p>
            </div>
          </div>
          
          {isProfileOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-100 dark:border-slate-700 overflow-hidden z-50">
              <div className="p-2">
                <button 
                  onClick={() => {
                    setIsProfileOpen(false)
                    navigate('/profile')
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-xl transition-colors flex items-center gap-2"
                >
                  <User className="w-4 h-4" />
                  Profile
                </button>
                <button
                  onClick={() => {
                    setIsProfileOpen(false)
                    navigate('/settings')
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-xl transition-colors flex items-center gap-2"
                >
                  <Settings className="w-4 h-4" />
                  Settings
                </button>
                <div className="h-px bg-slate-100 dark:bg-slate-700 my-1"></div>
                <button 
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition-colors flex items-center gap-2 font-medium"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
