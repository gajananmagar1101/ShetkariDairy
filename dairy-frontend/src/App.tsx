import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Suspense, lazy } from 'react'
import AppLayout from './components/layout/AppLayout'
import AuthGuard from './components/auth/AuthGuard'
import { LoadingBlock } from './components/ui/loading'

const Dashboard = lazy(() => import('./pages/Dashboard'))
const Customers = lazy(() => import('./pages/Customers'))
const MilkEntries = lazy(() => import('./pages/MilkEntries'))
const Billing = lazy(() => import('./pages/Billing'))
const Payments = lazy(() => import('./pages/Payments'))
const Inventory = lazy(() => import('./pages/Inventory'))
const Reports = lazy(() => import('./pages/Reports'))
const Login = lazy(() => import('./pages/Login'))
const Profile = lazy(() => import('./pages/Profile'))
const Settings = lazy(() => import('./pages/Settings'))

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingBlock label="Opening page..." minHeightClassName="min-h-screen" />}>
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
      </Suspense>
    </BrowserRouter>
  )
}

export default App
