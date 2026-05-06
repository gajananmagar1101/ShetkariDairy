import { BrowserRouter, Routes, Route } from 'react-router-dom'
import AppLayout from './components/layout/AppLayout'
import Dashboard from './pages/Dashboard'
import Customers from './pages/Customers'
import MilkEntries from './pages/MilkEntries'
import Billing from './pages/Billing'
import Payments from './pages/Payments'
import Inventory from './pages/Inventory'
import Reports from './pages/Reports'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="customers" element={<Customers />} />
          <Route path="milk-entries" element={<MilkEntries />} />
          <Route path="billing" element={<Billing />} />
          <Route path="payments" element={<Payments />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="reports" element={<Reports />} />
          <Route path="settings" element={<div className="p-4">Settings Page (Coming Soon)</div>} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
