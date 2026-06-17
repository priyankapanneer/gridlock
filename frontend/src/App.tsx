import React from 'react'
import { useAuthStore } from '@/store/authStore'
import AuthPage from '@/components/AuthPage'
import DashboardLayout from '@/components/DashboardLayout'

function App() {
  const { isAuthenticated } = useAuthStore()
  return (
    <div className="dark">
      {isAuthenticated ? <DashboardLayout /> : <AuthPage />}
    </div>
  )
}

export default App
