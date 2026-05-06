import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'

export default function AppLayout() {
  return (
    <div className="flex h-screen bg-[#f8fafc] overflow-hidden">
      {/* Background decoration for glassmorphism effect */}
      <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-primary-100/50 to-transparent pointer-events-none" />
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary-200/30 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 -left-24 w-72 h-72 bg-blue-200/20 rounded-full blur-3xl pointer-events-none" />

      {/* Sidebar */}
      <div className="z-10 w-64 p-4 hidden md:block flex-shrink-0">
        <Sidebar />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 z-10 p-4 md:pl-0">
        <Header />
        
        <main className="flex-1 overflow-auto mt-4 rounded-3xl glass p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
