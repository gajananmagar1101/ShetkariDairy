import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import { useSettingsStore } from '../../store/settingsStore'
import { Toaster } from 'react-hot-toast'

export default function AppLayout() {
  const { isMobileMenuOpen, setMobileMenuOpen } = useSettingsStore()

  return (
    <div className="flex h-screen bg-[#fafafc] dark:bg-slate-950 text-slate-800 dark:text-slate-200 transition-colors duration-500 overflow-hidden relative">
      {/* Delicate Mesh Gradient Background */}
      <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary-200/40 dark:bg-primary-900/20 rounded-full blur-[100px] pointer-events-none mix-blend-multiply dark:mix-blend-screen transition-colors duration-500" />
      <div className="fixed bottom-[-10%] right-[-5%] w-[50%] h-[50%] bg-fuchsia-200/30 dark:bg-fuchsia-900/20 rounded-full blur-[120px] pointer-events-none mix-blend-multiply dark:mix-blend-screen transition-colors duration-500" />
      <div className="fixed top-[20%] right-[10%] w-[30%] h-[30%] bg-cyan-200/30 dark:bg-cyan-900/20 rounded-full blur-[90px] pointer-events-none mix-blend-multiply dark:mix-blend-screen transition-colors duration-500" />

      {/* Desktop Sidebar */}
      <div className="z-10 w-[280px] p-5 hidden md:block flex-shrink-0 h-full">
        <Sidebar />
      </div>

      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 md:hidden transition-opacity"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-[280px] p-5 transform transition-transform duration-300 ease-in-out md:hidden ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <Sidebar />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 z-10 p-2 sm:p-5 sm:pl-0 h-full overflow-hidden">
        <Header />
        
        <main className="flex-1 overflow-auto mt-2 sm:mt-4 rounded-[2rem] glass dark:glass-dark p-4 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60 dark:border-white/10 relative transition-all duration-500">
          <Outlet />
        </main>
      </div>

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
