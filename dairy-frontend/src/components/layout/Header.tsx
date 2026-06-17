import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Moon, Sun, LogOut, Settings, User, Command } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useSettingsStore } from '../../store/settingsStore'
import { useAuthStore } from '../../store/useAuthStore'

type RevealStage = 'blank' | 'icon' | 'grow' | 'content' | 'move' | 'expand' | 'structure' | 'reveal' | 'done' | 'hidden' | 'complete'

type HeaderProps = {
  revealStage?: RevealStage | string
}

export default function Header({ revealStage = 'done' }: HeaderProps) {
  const { language, theme, toggleLanguage, toggleTheme } = useSettingsStore()
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)
  const isVisible = revealStage === 'done' || revealStage === 'reveal' || revealStage === 'structure' || revealStage === 'expand' || revealStage === 'complete'

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
    <motion.header
      className="sticky top-0 z-20 flex h-[60px] items-center justify-between gap-3 border-b border-[#E5E7EB]/60 bg-white px-4 min-w-0 dark:border-white/[0.04] dark:bg-[#111111] sm:px-5 lg:px-6"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : -10 }}
      transition={{ type: 'spring', stiffness: 150, damping: 20, delay: 0.2 }}
    >
      {/* Left: title + search */}
      <div className="flex items-center gap-4 min-w-0 self-center">
        <div className="min-w-0">
          <h1 className="truncate text-[1rem] font-bold leading-none tracking-tight text-[#1A1A1A] dark:text-white">
            Shetkari Vahi
          </h1>
        </div>

        <motion.div
          className="relative hidden md:block"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: isVisible ? 1 : 0, x: isVisible ? 0 : -10 }}
          transition={{ type: 'spring', stiffness: 140, damping: 20, delay: 0.28 }}
        >
          <Search className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors duration-200 ${isSearchFocused ? 'text-[#4F46E5]' : 'text-[#9CA3AF]'}`} />
          <input
            type="text"
            placeholder={language === 'mr' ? "काहीही शोधा..." : "Search anything..."}
            className="w-[16rem] rounded-xl border border-[#E5E7EB]/80 bg-[#F9F9F9] py-2 pl-10 pr-12 text-[13px] text-[#1A1A1A] transition-all duration-300 placeholder:text-[#9CA3AF] focus:border-[#4F46E5]/30 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/10 dark:border-white/[0.06] dark:bg-white/[0.03] dark:text-white dark:focus:border-[#6366F1]/20 dark:focus:bg-white/[0.05] xl:w-[20rem]"
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-0.5 rounded-md border border-[#E5E7EB] bg-white px-1.5 py-0.5 dark:border-white/[0.08] dark:bg-white/[0.04]">
            <Command className="h-3 w-3 text-[#9CA3AF]" />
            <span className="text-[10px] font-medium text-[#9CA3AF]">K</span>
          </div>
        </motion.div>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-2 min-w-0 self-center">
        <button
          onClick={toggleLanguage}
          className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-[#F5F5F5] text-[11px] font-bold text-[#6B7280] transition-all duration-200 hover:bg-[#EBEBEB] hover:text-[#1A1A1A] active:scale-95 dark:bg-white/[0.05] dark:text-slate-300 dark:hover:bg-white/[0.08]"
        >
          {language === 'en' ? 'म' : 'EN'}
        </button>

        <button
          onClick={toggleTheme}
          className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-[#F5F5F5] text-[#6B7280] transition-all duration-200 hover:bg-[#EBEBEB] hover:text-[#1A1A1A] active:scale-95 dark:bg-white/[0.05] dark:text-slate-300 dark:hover:bg-white/[0.08]"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={theme}
              initial={{ opacity: 0, rotate: -90, scale: 0.5 }}
              animate={{ opacity: 1, rotate: 0, scale: 1 }}
              exit={{ opacity: 0, rotate: 90, scale: 0.5 }}
              transition={{ duration: 0.2 }}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </motion.div>
          </AnimatePresence>
        </button>

        {/* Profile */}
        <div className="relative" ref={profileRef}>
          <div
            className="flex min-w-0 cursor-pointer items-center gap-2.5 border-l border-[#E5E7EB]/60 pl-3 sm:pl-4 dark:border-white/[0.04]"
            onClick={() => setIsProfileOpen(!isProfileOpen)}
          >
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center overflow-hidden rounded-[12px] bg-[#F5F5F5] transition-all duration-200 hover:shadow-[0_4px_12px_rgba(0,0,0,0.04)] dark:bg-white/[0.05]">
              {user?.picture ? (
                <img src={user.picture} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <span className="font-semibold text-[#6B7280] text-[11px]">
                  {user?.name ? user.name.substring(0, 2).toUpperCase() : 'GM'}
                </span>
              )}
            </div>
            <div className="hidden lg:flex flex-col text-left">
              <p className="text-[13px] font-semibold text-[#1A1A1A] dark:text-white leading-tight">{user?.name || 'Gajanan Magar'}</p>
            </div>
          </div>

          <AnimatePresence>
            {isProfileOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.96 }}
                transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                className="absolute right-0 z-50 mt-2 w-48 overflow-hidden rounded-2xl bg-white shadow-[0_20px_60px_rgba(0,0,0,0.08)] dark:bg-[#1A1A1A] dark:shadow-[0_20px_60px_rgba(0,0,0,0.5)]"
              >
                <div className="p-1.5">
                  <button
                    onClick={() => {
                      setIsProfileOpen(false)
                      navigate('/profile')
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[13px] text-[#6B7280] transition-all duration-150 hover:bg-[#F5F5F5] hover:text-[#1A1A1A] dark:text-slate-300 dark:hover:bg-white/[0.05]"
                  >
                    <User className="w-4 h-4" />
                    Profile
                  </button>
                  <button
                    onClick={() => {
                      setIsProfileOpen(false)
                      navigate('/settings')
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[13px] text-[#6B7280] transition-all duration-150 hover:bg-[#F5F5F5] hover:text-[#1A1A1A] dark:text-slate-300 dark:hover:bg-white/[0.05]"
                  >
                    <Settings className="w-4 h-4" />
                    Settings
                  </button>
                  <div className="my-1 h-px bg-[#E5E7EB]/60 dark:bg-white/[0.04]" />
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[13px] font-medium text-red-600 transition-all duration-150 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/[0.08]"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.header>
  )
}
