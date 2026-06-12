import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import LoginPage from './pages/LoginPage'
import AppShell from './components/AppShell'
import DashboardPage from './pages/DashboardPage'
import PipelinePage from './pages/PipelinePage'
import AdminPage from './pages/AdminPage'
import SchoolDetailPage from './pages/SchoolDetailPage'

function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading, isAdmin } = useAuth()
  if (loading) return (
    <div className="loading-screen">
      <div className="spinner" />
      <span className="text-muted text-sm">Loading SpaceMinds Hub...</span>
    </div>
  )
  if (!user) return <Navigate to="/login" replace />
  if (adminOnly && !isAdmin) return <Navigate to="/" replace />
  return children
}

export default function App() {
  const { user, loading } = useAuth()

  if (loading) return (
    <div className="loading-screen">
      <div className="spinner" />
      <span className="text-muted text-sm">Loading...</span>
    </div>
  )

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/" element={
        <ProtectedRoute>
          <AppShell />
        </ProtectedRoute>
      }>
        <Route index element={<DashboardPage />} />
        <Route path="pipeline" element={<PipelinePage />} />
        <Route path="pipeline/:schoolId" element={<SchoolDetailPage />} />
        <Route path="admin" element={
          <ProtectedRoute adminOnly>
            <AdminPage />
          </ProtectedRoute>
        } />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
