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
    <div className="relative flex h-screen overflow-hidden bg-[#f7f8fc] text-slate-800 transition-colors duration-500 dark:bg-[#050505] dark:text-slate-200">
      <GlobalLoadBar active={isNetworkBusy} />
      {/* Delicate Mesh Gradient Background */}
      <div className="pointer-events-none fixed left-[-8%] top-[-12%] h-[42%] w-[42%] rounded-full bg-primary-200/35 blur-[110px] transition-colors duration-500 dark:bg-white/5" />
      <div className="pointer-events-none fixed bottom-[-12%] right-[-6%] h-[48%] w-[48%] rounded-full bg-fuchsia-200/25 blur-[140px] transition-colors duration-500 dark:bg-white/[0.035]" />
      <div className="pointer-events-none fixed right-[14%] top-[18%] h-[28%] w-[28%] rounded-full bg-cyan-200/25 blur-[100px] transition-colors duration-500 dark:bg-white/[0.025]" />

      <div className="relative z-10 mx-auto flex w-full max-w-[1720px] gap-0 px-3 py-3 sm:px-4 sm:py-4 lg:px-6 lg:py-6">
        {/* Desktop Sidebar */}
        <div className="hidden h-full flex-shrink-0 md:block md:w-[290px] lg:w-[304px]">
          <div className="h-full p-2.5 lg:p-3">
            <Sidebar />
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-[2rem] bg-white/80 shadow-[0_20px_50px_rgba(15,23,42,0.08)] ring-1 ring-white/70 backdrop-blur-2xl transition-all duration-500 dark:bg-[#111214]/90 dark:shadow-[0_24px_60px_rgba(0,0,0,0.45)] dark:ring-white/10">
          <Header />

          <main className="relative flex-1 overflow-hidden rounded-b-[2rem] bg-transparent">
            <div className="h-full overflow-y-auto overflow-x-hidden">
              <div className={`min-h-full px-4 pb-24 pt-4 sm:px-6 sm:pt-5 lg:px-8 lg:pt-6 ${showMobileDock ? 'lg:pb-28' : 'lg:pb-10'}`}>
                <Outlet />
              </div>
            </div>
          </main>
        </div>
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
