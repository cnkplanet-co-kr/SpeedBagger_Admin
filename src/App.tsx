import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ConfigProvider } from 'antd'
import { GoogleOAuthProvider } from '@react-oauth/google'
import koKR from 'antd/locale/ko_KR'
import { theme } from './theme'
import LoginPage from './pages/LoginPage'
import AppLayout from './components/AppLayout'
import PartnersPage from './pages/partners/PartnersPage'
import MachinesPage from './pages/machines/MachinesPage'
import WmsPage from './pages/wms/WmsPage'
import AccountsPage from './pages/accounts/AccountsPage'
import MachineSettingsPage from './pages/machine-settings/MachineSettingsPage'
import MonitoringPage from './pages/monitoring/MonitoringPage'
import WorkStatPage from './pages/dashboard/WorkStatPage'
import { getStoredUser, getStoredToken, isTokenExpired, clearAuth } from './lib/auth'
import type { AuthUser } from './lib/auth'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? ''

export default function App() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const token = getStoredToken()
    const stored = getStoredUser()
    if (token && stored && !isTokenExpired(token)) {
      setUser(stored)
    } else {
      clearAuth()
    }
    setReady(true)
  }, [])

  if (!ready) return null

  function handleApproved(info: { name: string; email: string }) {
    const stored = getStoredUser()
    if (stored) setUser(stored)
    else setUser({ id: 0, email: info.email, name: info.name })
  }

  function handleLogout() {
    clearAuth()
    setUser(null)
  }

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <ConfigProvider theme={theme} locale={koKR}>
        {!user ? (
          <LoginPage onApproved={handleApproved} />
        ) : (
          <BrowserRouter basename={import.meta.env.BASE_URL}>
            <Routes>
              <Route element={<AppLayout onLogout={handleLogout} userName={user.name} />}>
                <Route index element={<Navigate to="/machine-status" replace />} />
                <Route path="/partners" element={<PartnersPage />} />
                <Route path="/machine-status" element={<MachinesPage />} />
                <Route path="/wms" element={<WmsPage />} />
                <Route path="/api-accounts" element={<AccountsPage />} />
                <Route path="/machines" element={<MachineSettingsPage />} />
                <Route path="/monitoring" element={<MonitoringPage />} />
                <Route path="/work-stat" element={<WorkStatPage />} />
              </Route>
            </Routes>
          </BrowserRouter>
        )}
      </ConfigProvider>
    </GoogleOAuthProvider>
  )
}
