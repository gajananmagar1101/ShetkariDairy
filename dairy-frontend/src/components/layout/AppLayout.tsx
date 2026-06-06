import { Outlet, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import axios from 'axios'
import Sidebar from './Sidebar'
import Header from './Header'
import MobileDock from './MobileDock'
import { useAuthStore } from '../../store/useAuthStore'
import { useSettingsStore } from '../../store/settingsStore'
import { Toaster } from 'react-hot-toast'
import { GlobalLoadBar } from '../ui/loading'
import { useNetworkActivity } from '../../lib/networkActivity'

export default function AppLayout() {
  const { user, token, setAuth } = useAuthStore()
  const { theme } = useSettingsStore()
  const isNetworkBusy = useNetworkActivity()
  const location = useLocation()
  const pathname = location.pathname
  const showMobileDock = pathname === '/' || pathname === '/dairy' || pathname === '/labour'

  useEffect(() => {
    const fetchProfile = async () => {
      if (!token || !user) return;
      try {
        const res = await axios.get('/api/users/profile')
        if (res.data.success) {
          const fetchedUser = res.data.data;
          setAuth({ ...user, ...fetchedUser }, token)
        }
      } catch (error) {
        console.error("Failed to fetch latest profile", error)
      }
    }
    fetchProfile()
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  return (
    <div className="flex h-screen bg-[#fafafc] dark:bg-slate-950 text-slate-800 dark:text-slate-200 transition-colors duration-500 overflow-hidden relative">
      <GlobalLoadBar active={isNetworkBusy} />
      {/* Delicate Mesh Gradient Background */}
      <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary-200/40 dark:bg-white/5 rounded-full blur-[100px] pointer-events-none mix-blend-multiply dark:mix-blend-screen transition-colors duration-500" />
      <div className="fixed bottom-[-10%] right-[-5%] w-[50%] h-[50%] bg-fuchsia-200/30 dark:bg-white/4 rounded-full blur-[120px] pointer-events-none mix-blend-multiply dark:mix-blend-screen transition-colors duration-500" />
      <div className="fixed top-[20%] right-[10%] w-[30%] h-[30%] bg-cyan-200/30 dark:bg-white/3 rounded-full blur-[90px] pointer-events-none mix-blend-multiply dark:mix-blend-screen transition-colors duration-500" />

      {/* Desktop Sidebar */}
      <div className="z-10 w-[280px] p-5 hidden md:block flex-shrink-0 h-full">
        <Sidebar />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 z-10 bg-sky-100/70 dark:bg-black p-0 sm:bg-transparent sm:p-5 sm:pl-0 h-full overflow-hidden">
        <Header />
        
        <main className="relative mt-5 flex-1 overflow-hidden rounded-t-[2.4rem] rounded-b-none bg-white shadow-[0_10px_26px_rgba(15,23,42,0.08)] border-x-0 border-b-0 border-slate-100 transition-all duration-500 sm:mt-4 sm:rounded-[2rem] sm:border dark:border-slate-800 dark:bg-[#141416] dark:shadow-[0_20px_40px_rgba(0,0,0,0.45)]">
          <div className="h-full overflow-y-auto overflow-x-hidden rounded-t-[inherit] rounded-b-none bg-white dark:bg-[#141416]">
            <div className={`min-h-full px-6 pt-6 ${showMobileDock ? 'pb-28' : 'pb-8'} sm:p-8`}>
              <Outlet />
            </div>
          </div>
        </main>
      </div>

      {showMobileDock && <MobileDock />}

      <Toaster position="top-center" toastOptions={{
        style: {
          borderRadius: '16px',
          background: theme === 'dark' ? '#1a1a1d' : '#fff',
          color: theme === 'dark' ? '#e5e7eb' : '#334155',
          boxShadow: '0 8px 30px rgba(0,0,0,0.1)',
          border: theme === 'dark' ? '1px solid rgba(51,65,85,0.8)' : '1px solid rgba(226, 232, 240, 0.8)',
          padding: '12px 16px',
          fontWeight: 500,
        },
      }} />
    </div>
  )
}
