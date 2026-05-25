import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Suspense, lazy, useEffect } from 'react'
import AppLayout from './components/layout/AppLayout'
import AuthGuard from './components/auth/AuthGuard'
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
const loadLabourWorkers = () => import('./pages/LabourWorkers')
const loadLabourHub = () => import('./pages/LabourHub')
const loadLabourWorkerForm = () => import('./pages/LabourWorkerForm')
const loadLabourAttendance = () => import('./pages/LabourAttendance')
const loadLabourRecoveries = () => import('./pages/LabourRecoveries')
const loadLogin = () => import('./pages/Login')
const loadProfile = () => import('./pages/Profile')
const loadSettings = () => import('./pages/Settings')

const Dashboard = lazy(loadDashboard)
const Home = lazy(loadHome)
const DairyHub = lazy(loadDairyHub)
const Customers = lazy(loadCustomers)
const MilkEntries = lazy(loadMilkEntries)
const Billing = lazy(loadBilling)
const Payments = lazy(loadPayments)
const Inventory = lazy(loadInventory)
const Reports = lazy(loadReports)
const LabourWorkers = lazy(loadLabourWorkers)
const LabourHub = lazy(loadLabourHub)
const LabourWorkerForm = lazy(loadLabourWorkerForm)
const LabourAttendance = lazy(loadLabourAttendance)
const LabourRecoveries = lazy(loadLabourRecoveries)
const Login = lazy(loadLogin)
const Profile = lazy(loadProfile)
const Settings = lazy(loadSettings)

const preloadAppRoutes = [
  loadDashboard,
  loadHome,
  loadDairyHub,
  loadCustomers,
  loadMilkEntries,
  loadBilling,
  loadPayments,
  loadInventory,
  loadReports,
  loadLabourWorkers,
  loadLabourHub,
  loadLabourWorkerForm,
  loadLabourAttendance,
  loadLabourRecoveries,
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
          <Route index element={<Home />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="dairy" element={<DairyHub />} />
          <Route path="customers" element={<Customers />} />
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
