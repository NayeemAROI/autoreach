import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Sidebar from './components/Sidebar'
import TopBar from './components/TopBar'
import Dashboard from './pages/Dashboard'
import Leads from './pages/Leads'
import Campaigns from './pages/Campaigns'
import CampaignBuilder from './pages/CampaignBuilder'
import CampaignDetails from './pages/CampaignDetails'
import Settings from './pages/Settings'
import Billing from './pages/Billing'
import Inbox from './pages/Inbox'
import Integrations from './pages/Integrations'
import Analytics from './pages/Analytics'
import ActivityLog from './pages/ActivityLog'
import Profile from './pages/Profile'
import WorkspaceMembers from './pages/WorkspaceMembers'
import WorkspaceSettings from './pages/WorkspaceSettings'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import Onboarding from './pages/Onboarding'

// Layout wrapper for authenticated pages to include the Sidebar
function DashboardLayout({ children }) {
  return (
    <div className="flex w-full min-h-screen bg-bg-primary">
      <Sidebar />
      <div className="flex-1 ml-[260px] flex flex-col min-h-screen">
        {/* Top header row — workspace dropdown aligned right */}
        <div className="shrink-0 flex items-center justify-end px-8 pt-5 pb-0">
          <TopBar />
        </div>
        {/* Page content */}
        <main className="flex-1 p-8 pt-4 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          {/* Onboarding (Protected, no sidebar) */}
          <Route path="/onboarding" element={
            <ProtectedRoute>
              <Onboarding />
            </ProtectedRoute>
          } />

          {/* Protected Routes */}
          <Route path="/" element={
            <ProtectedRoute>
              <DashboardLayout><Dashboard /></DashboardLayout>
            </ProtectedRoute>
          } />
          <Route path="/leads" element={
            <ProtectedRoute>
              <DashboardLayout><Leads /></DashboardLayout>
            </ProtectedRoute>
          } />
          <Route path="/campaigns" element={
            <ProtectedRoute>
              <DashboardLayout><Campaigns /></DashboardLayout>
            </ProtectedRoute>
          } />
          <Route path="/campaigns/:id" element={
            <ProtectedRoute>
              <DashboardLayout><CampaignDetails /></DashboardLayout>
            </ProtectedRoute>
          } />
          <Route path="/campaigns/:id/builder" element={
            <ProtectedRoute>
              <DashboardLayout><CampaignBuilder /></DashboardLayout>
            </ProtectedRoute>
          } />
          <Route path="/settings" element={
            <ProtectedRoute>
              <DashboardLayout><Settings /></DashboardLayout>
            </ProtectedRoute>
          } />
          <Route path="/billing" element={
            <ProtectedRoute>
              <DashboardLayout><Billing /></DashboardLayout>
            </ProtectedRoute>
          } />
          <Route path="/inbox" element={
            <ProtectedRoute>
              <DashboardLayout><Inbox /></DashboardLayout>
            </ProtectedRoute>
          } />
          <Route path="/integrations" element={
            <ProtectedRoute>
              <DashboardLayout><Integrations /></DashboardLayout>
            </ProtectedRoute>
          } />
          <Route path="/analytics" element={
            <ProtectedRoute>
              <DashboardLayout><Analytics /></DashboardLayout>
            </ProtectedRoute>
          } />
          <Route path="/activity-log" element={
            <ProtectedRoute>
              <DashboardLayout><ActivityLog /></DashboardLayout>
            </ProtectedRoute>
          } />
          <Route path="/profile" element={
            <ProtectedRoute>
              <DashboardLayout><Profile /></DashboardLayout>
            </ProtectedRoute>
          } />
          <Route path="/workspace/members" element={
            <ProtectedRoute>
              <DashboardLayout><WorkspaceMembers /></DashboardLayout>
            </ProtectedRoute>
          } />
          <Route path="/workspace/settings" element={
            <ProtectedRoute>
              <DashboardLayout><WorkspaceSettings /></DashboardLayout>
            </ProtectedRoute>
          } />
        </Routes>
      </Router>
    </AuthProvider>
  )
}

export default App
