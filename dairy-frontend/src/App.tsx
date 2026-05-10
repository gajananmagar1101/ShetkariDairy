import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Suspense, lazy, useEffect } from 'react'
import AppLayout from './components/layout/AppLayout'
import AuthGuard from './components/auth/AuthGuard'
import { LoadingBlock } from './components/ui/loading'

const loadDashboard = () => import('./pages/Dashboard')
const loadCustomers = () => import('./pages/Customers')
const loadMilkEntries = () => import('./pages/MilkEntries')
const loadBilling = () => import('./pages/Billing')
const loadPayments = () => import('./pages/Payments')
const loadInventory = () => import('./pages/Inventory')
const loadReports = () => import('./pages/Reports')
const loadLogin = () => import('./pages/Login')
const loadProfile = () => import('./pages/Profile')
const loadSettings = () => import('./pages/Settings')

const Dashboard = lazy(loadDashboard)
const Customers = lazy(loadCustomers)
const MilkEntries = lazy(loadMilkEntries)
const Billing = lazy(loadBilling)
const Payments = lazy(loadPayments)
const Inventory = lazy(loadInventory)
const Reports = lazy(loadReports)
const Login = lazy(loadLogin)
const Profile = lazy(loadProfile)
const Settings = lazy(loadSettings)

const preloadAppRoutes = [
  loadDashboard,
  loadCustomers,
  loadMilkEntries,
  loadBilling,
  loadPayments,
  loadInventory,
  loadReports,
  loadProfile,
  loadSettings,
]

function AppRoutes() {
  useEffect(() => {
    const warmRoutes = () => {
      preloadAppRoutes.forEach((loadRoute) => {
        void loadRoute()
      })
    }

    const canUseIdleCallback =
      typeof window !== 'undefined' && 'requestIdleCallback' in window

    if (canUseIdleCallback) {
      const idleId = (window as typeof window & {
        requestIdleCallback: (callback: () => void) => number
        cancelIdleCallback: (id: number) => void
      }).requestIdleCallback(warmRoutes)

      return () => {
        ;(window as typeof window & {
          cancelIdleCallback: (id: number) => void
        }).cancelIdleCallback(idleId)
      }
    }

    const timeoutId = globalThis.setTimeout(warmRoutes, 600)
    return () => globalThis.clearTimeout(timeoutId)
  }, [])

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      
      <Route element={<AuthGuard />}>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="customers" element={<Customers />} />
          <Route path="milk-entries" element={<MilkEntries />} />
          <Route path="billing" element={<Billing />} />
          <Route path="payments" element={<Payments />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="reports" element={<Reports />} />
          <Route path="profile" element={<Profile />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Route>
    </Routes>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingBlock label="Opening page..." minHeightClassName="min-h-screen" />}>
        <AppRoutes />
      </Suspense>
    </BrowserRouter>
  )
}

export default App
