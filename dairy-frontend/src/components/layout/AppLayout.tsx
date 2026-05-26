import { Outlet } from 'react-router-dom'
import { useEffect } from 'react'
import axios from 'axios'
import Sidebar from './Sidebar'
import Header from './Header'
import MobileDock from './MobileDock'
import { useAuthStore } from '../../store/useAuthStore'
import { Toaster } from 'react-hot-toast'
import { GlobalLoadBar } from '../ui/loading'
import { useNetworkActivity } from '../../lib/networkActivity'

export default function AppLayout() {
  const { user, token, setAuth } = useAuthStore()
  const isNetworkBusy = useNetworkActivity()

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

  return (
    <div className="flex h-screen bg-[#fafafc] dark:bg-slate-950 text-slate-800 dark:text-slate-200 transition-colors duration-500 overflow-hidden relative">
      <GlobalLoadBar active={isNetworkBusy} />
      {/* Delicate Mesh Gradient Background */}
      <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary-200/40 dark:bg-primary-900/20 rounded-full blur-[100px] pointer-events-none mix-blend-multiply dark:mix-blend-screen transition-colors duration-500" />
      <div className="fixed bottom-[-10%] right-[-5%] w-[50%] h-[50%] bg-fuchsia-200/30 dark:bg-fuchsia-900/20 rounded-full blur-[120px] pointer-events-none mix-blend-multiply dark:mix-blend-screen transition-colors duration-500" />
      <div className="fixed top-[20%] right-[10%] w-[30%] h-[30%] bg-cyan-200/30 dark:bg-cyan-900/20 rounded-full blur-[90px] pointer-events-none mix-blend-multiply dark:mix-blend-screen transition-colors duration-500" />

      {/* Desktop Sidebar */}
      <div className="z-10 w-[280px] p-5 hidden md:block flex-shrink-0 h-full">
        <Sidebar />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 z-10 bg-sky-50/70 p-0 sm:bg-transparent sm:p-5 sm:pl-0 h-full overflow-hidden">
        <Header />
        
        <main className="mt-5 flex flex-1 flex-col overflow-hidden rounded-t-[2.4rem] rounded-b-none glass shadow-[0_8px_30px_rgb(0,0,0,0.04)] border-x-0 border-b-0 border-white/60 transition-all duration-500 sm:mt-4 sm:rounded-[2rem] sm:border">
          <div className="h-16 shrink-0 sm:hidden" />
          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-6 pb-28 sm:p-8">
            <Outlet />
          </div>
        </main>
      </div>

      <MobileDock />

      <Toaster position="top-center" toastOptions={{
        style: {
          borderRadius: '16px',
          background: '#fff',
          color: '#334155',
          boxShadow: '0 8px 30px rgba(0,0,0,0.1)',
          border: '1px solid rgba(226, 232, 240, 0.8)',
          padding: '12px 16px',
          fontWeight: 500,
        },
      }} />
    </div>
  )
}
