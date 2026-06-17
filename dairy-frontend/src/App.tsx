import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Suspense, lazy, useEffect, useState, useCallback } from 'react'
import AppLayout from './components/layout/AppLayout'
import AuthGuard from './components/auth/AuthGuard'
import SplashScreen from './components/layout/SplashScreen'
import { useAuthStore } from './store/useAuthStore'
import { LoadingBlock } from './components/ui/loading'

const loadDashboard = () => import('./pages/Dashboard')
const loadHome = () => import('./pages/Home')
const loadDairyHub = () => import('./pages/DairyHub')
const loadCustomers = () => import('./pages/Customers')
const loadMilkEntries = () => import('./pages/MilkEntries')
const loadBilling = () => import('./pages/Billing')
const loadPayments = () => import('./pages/Payments')
const loadInventory = () => import('./pages/Inventory')
const loadReports = () => import('./pages/Reports')
const loadCustomerMonthView = () => import('./pages/CustomerMonthView')
const loadLabourWorkers = () => import('./pages/LabourWorkers')
const loadLabourHub = () => import('./pages/LabourHub')
const loadLabourWorkerForm = () => import('./pages/LabourWorkerForm')
const loadLabourAttendance = () => import('./pages/LabourAttendance')
const loadLabourRecoveries = () => import('./pages/LabourRecoveries')
const loadLogin = () => import('./pages/Login')
const loadProfile = () => import('./pages/Profile')
const loadSettings = () => import('./pages/Settings')
const loadAnimationDemo = () => import('./pages/AnimationDemo')

const Dashboard = lazy(loadDashboard)
const AnimationDemo = lazy(loadAnimationDemo)
const Home = lazy(loadHome)
const DairyHub = lazy(loadDairyHub)
const Customers = lazy(loadCustomers)
const MilkEntries = lazy(loadMilkEntries)
const Billing = lazy(loadBilling)
const Payments = lazy(loadPayments)
const Inventory = lazy(loadInventory)
const Reports = lazy(loadReports)
const CustomerMonthView = lazy(loadCustomerMonthView)
const LabourWorkers = lazy(loadLabourWorkers)
const LabourHub = lazy(loadLabourHub)
const LabourWorkerForm = lazy(loadLabourWorkerForm)
const LabourAttendance = lazy(loadLabourAttendance)
const LabourRecoveries = lazy(loadLabourRecoveries)
const Login = lazy(loadLogin)
const Profile = lazy(loadProfile)
const Settings = lazy(loadSettings)

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route path="/animation-demo" element={<AnimationDemo />} />

      <Route element={<AuthGuard />}>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<Home />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="dairy" element={<DairyHub />} />
          <Route path="customers" element={<Customers />} />
          <Route path="customers/:customerId/month/:year/:month" element={<CustomerMonthView />} />
          <Route path="milk-entries" element={<MilkEntries />} />
          <Route path="billing" element={<Billing />} />
          <Route path="payments" element={<Payments />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="reports" element={<Reports />} />
          <Route path="labour" element={<LabourHub />} />
          <Route path="labour/workers" element={<LabourWorkers />} />
          <Route path="labour/workers/new" element={<LabourWorkerForm />} />
          <Route path="labour/workers/:workerId/edit" element={<LabourWorkerForm />} />
          <Route path="labour/attendance" element={<LabourAttendance />} />
          <Route path="labour/recoveries" element={<LabourRecoveries />} />
          <Route path="profile" element={<Profile />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Route>
    </Routes>
  )
}

function AppShell() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const hasHydrated = useAuthStore((s) => s.hasHydrated)

  const [showSplash, setShowSplash] = useState(() => {
    return !sessionStorage.getItem('splash-seen')
  })

  const handleSplashComplete = useCallback(() => {
    setShowSplash(false)
    sessionStorage.setItem('splash-seen', 'true')
  }, [])

  useEffect(() => {
    if (!isAuthenticated) {
      sessionStorage.removeItem('dashboard-intro-seen')
      sessionStorage.removeItem('splash-seen')
    }
  }, [isAuthenticated])

  // Show splash on fresh load
  if (showSplash) {
    return <SplashScreen onComplete={handleSplashComplete} />
  }

  if (!hasHydrated) {
    return <LoadingBlock label="Opening page..." minHeightClassName="min-h-screen" />
  }

  if (!isAuthenticated) {
    return (
      <Suspense fallback={<LoadingBlock label="Loading..." minHeightClassName="min-h-screen" />}>
        <Login />
      </Suspense>
    )
  }

  if (window.location.pathname === '/login') {
    window.history.replaceState(null, '', '/')
  }

  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingBlock label="Opening page..." minHeightClassName="min-h-screen" />}>
        <AppRoutes />
      </Suspense>
    </BrowserRouter>
  )
}

function App() {
  return <AppShell />
}

export default App
